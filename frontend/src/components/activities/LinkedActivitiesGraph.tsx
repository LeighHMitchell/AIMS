'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { getRelationshipTypeName } from '@/data/iati-relationship-types';

interface Activity {
  id: string;
  title: string;
  iatiIdentifier: string;
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

interface LinkedActivitiesGraphProps {
  currentActivity: Activity;
  linkedActivities: LinkedActivity[];
}

const LinkedActivitiesGraph: React.FC<LinkedActivitiesGraphProps> = ({
  currentActivity,
  linkedActivities
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

    // Create nodes data
    const nodes = [
      {
        id: currentActivity.id,
        title: currentActivity.title,
        iatiId: currentActivity.iatiIdentifier,
        activityId: currentActivity.id,
        organizationName: currentActivity.organizationName || '',
        status: currentActivity.status || '',
        acronym: '',
        type: 'current',
        fx: width / 2,
        fy: height / 2
      },
      ...linkedActivities.map(link => ({
        id: link.id,
        title: link.activityTitle,
        iatiId: link.iatiIdentifier,
        activityId: link.otherIdentifier || link.activityId || '',
        organizationName: link.organizationName || '',
        organizationAcronym: link.organizationAcronym || '',
        status: link.status || '',
        acronym: link.acronym || '',
        type: 'linked',
        relationshipType: link.relationshipType,
        relationshipLabel: getRelationshipTypeName(link.relationshipType),
        narrative: link.narrative || ''
      }))
    ];

    // Create links data
    const links = linkedActivities.map(link => ({
      source: currentActivity.id,
      target: link.id,
      type: link.relationshipType,
      label: getRelationshipTypeName(link.relationshipType)
    }));

    // Create SVG and root group for zoom/pan
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .style("cursor", "grab");

    const root = svg.append("g");

    // Define colors for different relationship types
    const getRelationshipColor = (type: string) => {
      switch (type) {
        case '1': return "#8b5cf6"; // Parent - Purple
        case '2': return "#3b82f6"; // Child - Blue
        case '3': return "#10b981"; // Sibling - Green
        case '4': return "#f59e0b"; // Co-funded - Orange
        case '5': return "#06b6d4"; // Third Party - Cyan
        default: return "#6b7280"; // Default - Gray
      }
    };

    // Define arrow markers for different relationship types
    const defs = svg.append("defs");
    
    // Arrow markers with colors
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

    // Create force simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links as any)
        .id((d: any) => d.id)
        .distance(300))
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(75));
    
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

    // Get node color based on relationship type
    const getNodeColor = (d: any) => {
      if (d.type === 'current') return '#111827'; // Dark gray for current activity
      return getRelationshipColor(d.relationshipType); // Color based on relationship
    };

    const getNodeStroke = (d: any) => {
      if (d.type === 'current') return '#0b1220';
      // Use a darker shade of the same color for stroke
      const color = getRelationshipColor(d.relationshipType);
      switch (d.relationshipType) {
        case '1': return "#7c3aed"; // Darker purple
        case '2': return "#2563eb"; // Darker blue
        case '3': return "#059669"; // Darker green
        case '4': return "#d97706"; // Darker orange
        case '5': return "#0891b2"; // Darker cyan
        default: return "#4b5563"; // Darker gray
      }
    };

    // Add circles
    node.append("circle")
      .attr("r", d => d.type === 'current' ? 42 : 36)
      .attr("fill", (d: any) => getNodeColor(d))
      .attr("stroke", (d: any) => getNodeStroke(d))
      .attr("stroke-width", 3)
      .attr("opacity", d => d.type === 'current' ? 1 : 0.9);

    // Helper function to wrap text
    const wrapText = (text: any, d: any) => {
      const words = d.title.split(/\s+/);
      const acronym = d.acronym;
      const maxCharsPerLine = d.type === 'current' ? 14 : 12;
      const maxLines = 3;
      
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
      
      // Limit to maxLines
      if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] += "...";
      }
      
      // Add acronym if it exists and fits
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
      const fontSize = d.type === 'current' ? 12 : 10;
      const lineHeight = fontSize + 2;
      const startY = -(lines.length - 1) * lineHeight / 2;
      
      lines.forEach((line: string, i: number) => {
        textGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", startY + i * lineHeight)
          .attr("font-size", fontSize + "px")
          .attr("font-weight", d.type === 'current' ? "600" : "500")
          .attr("fill", d.type === 'current' ? '#ffffff' : '#ffffff')
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
      
      // Helper function to get status badge styling
      const getStatusBadgeStyle = (status: string) => {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('active') || statusLower.includes('implementation')) {
          return { bg: '#dcfce7', color: '#166534', text: status }; // Green
        } else if (statusLower.includes('completed') || statusLower.includes('closed')) {
          return { bg: '#e0e7ff', color: '#3730a3', text: status }; // Blue
        } else if (statusLower.includes('suspended') || statusLower.includes('cancelled')) {
          return { bg: '#fee2e2', color: '#dc2626', text: status }; // Red
        } else if (statusLower.includes('planned') || statusLower.includes('pipeline')) {
          return { bg: '#fef3c7', color: '#d97706', text: status }; // Yellow
        }
        return { bg: '#f3f4f6', color: '#374151', text: status }; // Gray default
      };
      
      // Build structured tooltip content
      let content = `
        <div style="font-weight: 600; font-size: 16px; line-height: 1.3; margin-bottom: 12px; color: #111827;">
          ${d.title}
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
      `;
      
      // Acronym
      if (d.acronym) {
        content += `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #6b7280; font-size: 13px;">Acronym</span>
            <span style="font-size: 13px; font-weight: 500; color: #111827;">${d.acronym}</span>
          </div>
        `;
      }
      
      // Activity ID
      if (d.activityId) {
        content += `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #6b7280; font-size: 13px;">Activity ID</span>
            <span style="font-size: 13px; font-weight: 500; color: #111827; text-align: right; max-width: 60%; word-break: break-all;">${d.activityId}</span>
          </div>
        `;
      }
      
      // IATI ID
      if (d.iatiId) {
        content += `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #6b7280; font-size: 13px;">IATI ID</span>
            <span style="font-size: 13px; font-weight: 500; color: #111827; text-align: right; max-width: 60%; word-break: break-all;">${d.iatiId}</span>
          </div>
        `;
      }
      
      // Reporting Organization
      if (d.organizationName) {
        const orgText = d.organizationAcronym ? `${d.organizationName} (${d.organizationAcronym})` : d.organizationName;
        content += `
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span style="color: #6b7280; font-size: 13px; width: 33%; flex-shrink: 0;">Reporting Org</span>
            <span style="font-size: 13px; font-weight: 500; color: #111827; text-align: right; width: 67%; line-height: 1.3;">${orgText}</span>
          </div>
        `;
      }
      
      // Status
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
      
      content += `</div>`; // Close main container
      
      // Relationship section for linked activities
      if (d.type === 'linked' && d.relationshipLabel) {
        const relationshipColor = getRelationshipColor(d.relationshipType);
        
        content += `
          <div style="border-top: 1px solid #e5e7eb; margin: 12px 0; padding-top: 12px;">
            <div style="display: flex; align-items: center;">
              <span style="color: ${relationshipColor}; font-size: 13px; font-weight: 600;">
                Relationship: ${d.relationshipLabel}
              </span>
            </div>
        `;
        
        if (d.narrative) {
          content += `
            <div style="margin-top: 8px; padding: 8px; background-color: #f9fafb; border-radius: 6px; border: 1px solid #f3f4f6;">
              <span style="color: #6b7280; font-style: italic; font-size: 12px; line-height: 1.3;">
                "${d.narrative}"
              </span>
            </div>
          `;
        }
        
        content += `</div>`; // Close relationship section
      }
      
      // Current activity indicator
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
      .scaleExtent([0.75, 2.5])
      .on('zoom', (event) => {
        root.attr('transform', event.transform);
      });

    zoomRef.current = zoom;
    svg.call(zoom as any);
    
    // Store reference to the root group for the zoom reset function
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
      if (d.type !== 'current') { // Keep central node fixed
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
  }, [currentActivity, linkedActivities]);

  // Reset function
  const handleReset = () => {
    if (!svgRef.current || !containerRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const root = svg.select('g');
    
    if (root.empty()) {
      console.warn('SVG root group not found');
      return;
    }
    
    // Get current container dimensions
    const containerRect = containerRef.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    
    // Reset the zoom transform directly on the root group
    root.transition()
      .duration(750)
      .attr('transform', 'translate(0,0) scale(1)');
    
    // If we have a zoom behavior stored, reset its internal transform
    if (zoomRef.current) {
      svg.call(zoomRef.current.transform, d3.zoomIdentity);
    }
    
    // If simulation exists, re-center and restart it
    if (simulationRef.current) {
      // Update the center force with current dimensions
      simulationRef.current
        .force("center", d3.forceCenter(width / 2, height / 2))
        .alpha(0.3)
        .restart();
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <button
        onClick={handleReset}
        className="absolute top-4 right-4 z-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-lg hover:shadow-xl"
        title="Reset zoom and center the visualization"
      >
        Reset View
      </button>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default LinkedActivitiesGraph;
