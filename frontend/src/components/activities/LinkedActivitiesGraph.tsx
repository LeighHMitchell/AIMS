'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getRelationshipTypeName } from '@/data/iati-relationship-types';

interface Activity {
  id: string;
  title: string;
  iatiIdentifier: string;
  otherIdentifier?: string;
  status?: string;
  organizationName?: string;
}

interface LinkedActivity {
  id: string;
  activityId: string | null;
  activityTitle: string;
  acronym?: string;
  otherIdentifier?: string;
  iatiIdentifier: string;
  relationshipType: string;
  relationshipTypeLabel: string;
  narrative?: string;
  isExternal: boolean;
  direction: 'incoming' | 'outgoing';
  organizationName?: string;
  organizationAcronym?: string;
  status?: string;
}

// Graph data structures for multi-level visualization
interface GraphNode {
  id: string;
  title: string;
  iatiId: string;
  activityId: string;
  organizationName: string;
  organizationAcronym: string;
  status: string;
  acronym: string;
  distance: number;
  icon?: string | null;
}

interface GraphEdge {
  source: string;
  target: string;
  relationshipType: string;
  relationshipLabel: string;
  narrative?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
  totalCount: number;
  currentActivityId: string;
}

type DepthOption = '1' | '2' | 'all';

interface LinkedActivitiesGraphProps {
  currentActivity: Activity;
  linkedActivities: LinkedActivity[];
  graphData?: GraphData | null;
  depth?: DepthOption;
  onDepthChange?: (depth: DepthOption) => void;
  loading?: boolean;
}

const LinkedActivitiesGraph: React.FC<LinkedActivitiesGraphProps> = ({
  currentActivity,
  linkedActivities,
  graphData,
  depth = '1',
  onDepthChange,
  loading = false
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simulationRef = useRef<any>(null);
  const zoomRef = useRef<any>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !currentActivity) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    // Get container dimensions
    const containerRect = containerRef.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    // Determine data source: use graphData if available, otherwise fall back to linkedActivities
    let nodes: any[];
    let links: any[];

    if (graphData && graphData.nodes.length > 0) {
      // Use graph data from API (multi-level)
      nodes = graphData.nodes.map(node => ({
        id: node.id,
        title: node.title,
        iatiId: node.iatiId,
        activityId: node.activityId,
        organizationName: node.organizationName || '',
        organizationAcronym: node.organizationAcronym || '',
        status: node.status || '',
        acronym: node.acronym || '',
        type: node.id === graphData.currentActivityId ? 'current' : 'linked',
        distance: node.distance,
        // Fix current activity in center
        ...(node.id === graphData.currentActivityId ? { fx: width / 2, fy: height / 2 } : {})
      }));

      links = graphData.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        type: edge.relationshipType,
        label: edge.relationshipLabel,
        narrative: edge.narrative
      }));
    } else {
      // Fall back to original single-level behavior
      // Use activityId (activity UUID) as the node id, not link.id (relationship ID)
      nodes = [
        {
          id: currentActivity.id,
          title: currentActivity.title,
          iatiId: currentActivity.iatiIdentifier,
          activityId: currentActivity.otherIdentifier || '',
          organizationName: currentActivity.organizationName || '',
          status: currentActivity.status || '',
          acronym: '',
          type: 'current',
          distance: 0,
          fx: width / 2,
          fy: height / 2
        },
        ...linkedActivities.map(link => ({
          id: link.activityId || link.id, // Use activityId (activity UUID) as node id
          title: link.activityTitle,
          iatiId: link.iatiIdentifier,
          activityId: link.otherIdentifier || '',
          organizationName: link.organizationName || '',
          organizationAcronym: link.organizationAcronym || '',
          status: link.status || '',
          acronym: link.acronym || '',
          type: 'linked',
          distance: 1,
          relationshipType: link.relationshipType,
          relationshipLabel: getRelationshipTypeName(link.relationshipType),
          narrative: link.narrative || ''
        }))
      ];

      // Links reference activity UUIDs, not relationship IDs
      links = linkedActivities.map(link => {
        const linkedNodeId = link.activityId || link.id;
        if (link.relationshipType === '1') {
          return {
            source: linkedNodeId,
            target: currentActivity.id,
            type: link.relationshipType,
            label: getRelationshipTypeName(link.relationshipType)
          };
        }
        return {
          source: currentActivity.id,
          target: linkedNodeId,
          type: link.relationshipType,
          label: getRelationshipTypeName(link.relationshipType)
        };
      });
    }

    // Validate links - ensure source and target exist in nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    const validLinks = links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source?.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target?.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    // Use validated links
    links = validLinks;

    // Create SVG and root group for zoom/pan
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("cursor", "grab");

    const root = svg.append("g");

    // Define colors for different relationship types - using brand palette
    const getRelationshipColor = (type: string) => {
      switch (type) {
        case '1': return "#dc2625"; // Parent - Primary Scarlet
        case '2': return "#4c5568"; // Child - Blue Slate
        case '3': return "#7b95a7"; // Sibling - Cool Steel
        case '4': return "#9ca3af"; // Co-funded - derived from Pale Slate
        case '5': return "#64748b"; // Third Party - slate gray
        default: return "#4c5568"; // Default - Blue Slate
      }
    };

    // Define arrow markers for different relationship types
    const defs = svg.append("defs");
    
    ['1', '2', '3', '4', '5', 'default'].forEach(type => {
      defs.append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25)
        .attr("refY", 0)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", getRelationshipColor(type));
    });

    // Adjust force simulation based on number of nodes
    const nodeCount = nodes.length;
    const linkDistance = nodeCount > 20 ? 150 : nodeCount > 10 ? 180 : 200;
    const chargeStrength = nodeCount > 20 ? -800 : nodeCount > 10 ? -1000 : -1200;

    // Create force simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links as any)
        .id((d: any) => d.id)
        .distance(linkDistance))
      .force("charge", d3.forceManyBody().strength(chargeStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));
    
    simulationRef.current = simulation;

    // Add links
    const link = root.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: any) => getRelationshipColor(d.type))
      .attr("stroke-width", 3)
      .attr("opacity", 0.8)
      .attr("marker-end", (d: any) => `url(#arrow-${d.type})`);

    // Add link labels
    const linkLabel = root.append("g")
      .selectAll("text")
      .data(links)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", (d: any) => getRelationshipColor(d.type))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 3)
      .style("paint-order", "stroke fill")
      .text((d: any) => d.label);

    // Add nodes
    const node = root.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    // Get node size based on distance from current activity
    const getNodeSize = (d: any) => {
      if (d.type === 'current' || d.distance === 0) return 42;
      if (d.distance === 1) return 36;
      if (d.distance === 2) return 30;
      return 24; // distance 3+
    };

    // Get node color based on type and distance
    const getNodeColor = (d: any) => {
      if (d.type === 'current') return '#111827';
      // For multi-level, use a slightly faded color for distant nodes
      const baseColor = d.relationshipType ? getRelationshipColor(d.relationshipType) : '#4c5568';
      if (d.distance > 2) {
        return '#6b7280'; // Gray for very distant nodes
      }
      return baseColor;
    };

    const getNodeStroke = (d: any) => {
      if (d.type === 'current') return '#0b1220';
      switch (d.relationshipType) {
        case '1': return "#b91c1c";
        case '2': return "#374151";
        case '3': return "#5c7a8a";
        case '4': return "#6b7280";
        case '5': return "#475569";
        default: return "#374151";
      }
    };

    const getNodeOpacity = (d: any) => {
      if (d.type === 'current') return 1;
      if (d.distance === 1) return 0.9;
      if (d.distance === 2) return 0.75;
      return 0.6; // distance 3+
    };

    // Add circles with size based on distance
    node.append("circle")
      .attr("r", (d: any) => getNodeSize(d))
      .attr("fill", (d: any) => getNodeColor(d))
      .attr("stroke", (d: any) => getNodeStroke(d))
      .attr("stroke-width", (d: any) => d.type === 'current' ? 3 : d.distance > 1 ? 2 : 3)
      .attr("opacity", (d: any) => getNodeOpacity(d));

    // Helper function to wrap text
    const wrapText = (text: any, d: any) => {
      const words = d.title.split(/\s+/);
      const acronym = d.acronym;
      const nodeSize = getNodeSize(d);
      const maxCharsPerLine = nodeSize >= 36 ? 14 : nodeSize >= 30 ? 10 : 8;
      const maxLines = nodeSize >= 30 ? 3 : 2;
      
      let lines: string[] = [];
      let currentLine = "";
      
      words.forEach((word: string) => {
        if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
          currentLine += (currentLine ? " " : "") + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) lines.push(currentLine);
      
      if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] += "...";
      }
      
      if (acronym && lines.length < maxLines) {
        lines.push(`(${acronym})`);
      } else if (acronym && lines.length === 1) {
        lines[0] += ` (${acronym})`;
      }
      
      return lines;
    };

    // Add multi-line labels
    node.each(function(d: any) {
      const textGroup = d3.select(this);
      const lines = wrapText(null, d);
      const nodeSize = getNodeSize(d);
      const fontSize = nodeSize >= 36 ? 12 : nodeSize >= 30 ? 10 : 8;
      const lineHeight = fontSize + 2;
      const startY = -(lines.length - 1) * lineHeight / 2;
      
      lines.forEach((line: string, i: number) => {
        textGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", startY + i * lineHeight)
          .attr("font-size", fontSize + "px")
          .attr("font-weight", d.type === 'current' ? "600" : "500")
          .attr("fill", '#ffffff')
          .attr("stroke", d.type === 'current' ? 'none' : 'rgba(0,0,0,0.3)')
          .attr("stroke-width", d.type === 'current' ? 0 : 0.5)
          .style("paint-order", "stroke fill")
          .text(line);
      });
    });

    // Add enhanced tooltips
    const tooltip = d3.select("body").append("div")
      .attr("class", "activity-graph-tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("padding", "16px")
      .style("background", "white")
      .style("color", "#374151")
      .style("border-radius", "12px")
      .style("font-size", "13px")
      .style("pointer-events", "none")
      .style("box-shadow", "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)")
      .style("border", "1px solid #e5e7eb")
      .style("max-width", "320px")
      .style("min-width", "280px")
      .style("z-index", "10000")
      .style("font-family", "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");

    node.on("mouseover", (event, d: any) => {
      tooltip.transition()
        .duration(200)
        .style("opacity", 1);
      
      const getStatusName = (status: string) => {
        const statusMap: Record<string, string> = {
          '1': '1 - Pipeline/Identification',
          '2': '2 - Implementation',
          '3': '3 - Completion',
          '4': '4 - Post-completion',
          '5': '5 - Cancelled',
          '6': '6 - Suspended',
        };
        return statusMap[status] || status;
      };
      
      const getStatusBadgeStyle = (status: string) => {
        const statusName = getStatusName(status);
        const statusLower = statusName.toLowerCase();
        if (statusLower.includes('implementation')) {
          return { bg: '#dcfce7', color: '#166534', text: statusName };
        } else if (statusLower.includes('completion') || statusLower.includes('post-completion')) {
          return { bg: '#e0e7ff', color: '#3730a3', text: statusName };
        } else if (statusLower.includes('suspended') || statusLower.includes('cancelled')) {
          return { bg: '#fee2e2', color: '#dc2626', text: statusName };
        } else if (statusLower.includes('planned') || statusLower.includes('pipeline')) {
          return { bg: '#fef3c7', color: '#d97706', text: statusName };
        }
        return { bg: '#f3f4f6', color: '#374151', text: statusName };
      };
      
      let content = `
        <div style="font-weight: 600; font-size: 16px; line-height: 1.3; margin-bottom: 12px; color: #111827;">
          ${d.title}
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
      `;
      
      if (d.acronym) {
        content += `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #6b7280; font-size: 13px;">Acronym</span>
            <span style="font-size: 13px; font-weight: 500; color: #111827;">${d.acronym}</span>
          </div>
        `;
      }
      
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      if (d.activityId && !isUUID(d.activityId)) {
        content += `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #6b7280; font-size: 13px;">Activity ID</span>
            <code style="font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-size: 12px; color: #374151;">${d.activityId}</code>
          </div>
        `;
      }
      
      // IATI ID - styled with monospace and gray background
      if (d.iatiId) {
        content += `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #6b7280; font-size: 13px;">IATI ID</span>
            <code style="font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-size: 12px; color: #374151;">${d.iatiId}</code>
          </div>
        `;
      }
      
      if (d.organizationName) {
        const orgText = d.organizationAcronym ? `${d.organizationName} (${d.organizationAcronym})` : d.organizationName;
        content += `
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span style="color: #6b7280; font-size: 13px; width: 40%; flex-shrink: 0;">Reporting Organisation</span>
            <span style="font-size: 13px; font-weight: 500; color: #111827; text-align: right; width: 60%; line-height: 1.3;">${orgText}</span>
          </div>
        `;
      }
      
      if (d.status && d.status !== '1') {
        const statusStyle = getStatusBadgeStyle(d.status);
        content += `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #6b7280; font-size: 13px;">Status</span>
            <span style="display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; background-color: ${statusStyle.bg}; color: ${statusStyle.color};">
              ${statusStyle.text}
            </span>
          </div>
        `;
      }
      
      content += `</div>`;
      
      // Show distance for multi-level view
      if (d.distance !== undefined && d.distance > 0) {
        const relationshipColor = d.relationshipType ? getRelationshipColor(d.relationshipType) : '#6b7280';
        content += `
          <div style="border-top: 1px solid #e5e7eb; margin: 12px 0; padding-top: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #6b7280; font-size: 12px;">Distance:</span>
              <span style="color: ${relationshipColor}; font-size: 12px; font-weight: 600;">
                ${d.distance} ${d.distance === 1 ? 'hop' : 'hops'} from current
              </span>
            </div>
          </div>
        `;
      }
      
      if (d.type === 'current') {
        content += `
          <div style="border-top: 1px solid #e5e7eb; margin: 12px 0; padding-top: 12px; text-align: center;">
            <span style="color: #3b82f6; font-size: 13px; font-weight: 600;">
              Current Activity
            </span>
          </div>
        `;
      }

      tooltip.html(content)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition()
        .duration(300)
        .style("opacity", 0);
    });

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabel
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Enable zoom & pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        root.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom as any);
    svg.attr("data-root-group", "true");

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      if (d.type !== 'current') {
        d.fx = null;
        d.fy = null;
      }
    }

    // Cleanup
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      tooltip.remove();
    };
  }, [currentActivity, linkedActivities, graphData]);

  // Reset function
  const handleReset = () => {
    if (!svgRef.current || !containerRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const root = svg.select('g');
    
    if (root.empty()) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    
    root.transition()
      .duration(750)
      .attr('transform', 'translate(0,0) scale(1)');
    
    if (zoomRef.current) {
      svg.call(zoomRef.current.transform, d3.zoomIdentity);
    }
    
    if (simulationRef.current) {
      simulationRef.current
        .force("center", d3.forceCenter(width / 2, height / 2))
        .alpha(0.3)
        .restart();
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {/* Depth selector */}
        {onDepthChange && (
          <select
            value={depth}
            onChange={(e) => onDepthChange(e.target.value as DepthOption)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 shadow-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            disabled={loading}
          >
            <option value="1">Direct links</option>
            <option value="2">2 levels</option>
            <option value="all">Full network</option>
          </select>
        )}
        
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-[#4c5568] text-white rounded-lg hover:bg-[#374151] transition-colors text-sm font-medium shadow-lg hover:shadow-xl"
          title="Reset zoom and center the visualization"
        >
          Reset View
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">Loading relationships...</span>
          </div>
        </div>
      )}

      {/* Truncation warning */}
      {graphData?.truncated && (
        <div className="absolute bottom-4 left-4 z-10 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          Graph truncated — showing {graphData.totalCount} activities (max 100)
        </div>
      )}

      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default LinkedActivitiesGraph;
