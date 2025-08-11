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
  iatiIdentifier: string;
  relationshipType: string;
  relationshipTypeLabel: string;
  narrative?: string;
  isExternal: boolean;
  direction: 'incoming' | 'outgoing';
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
        type: 'current',
        fx: width / 2,
        fy: height / 2
      },
      ...linkedActivities.map(link => ({
        id: link.id,
        title: link.activityTitle,
        iatiId: link.iatiIdentifier,
        type: 'linked',
        relationshipType: link.relationshipType,
        relationshipLabel: getRelationshipTypeName(link.relationshipType)
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

    // Define arrow markers for different relationship types
    const defs = svg.append("defs");
    
    // Arrow markers
    ['parent', 'child', 'sibling', 'default'].forEach(type => {
      defs.append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#6b7280");
    });

    // Create force simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links as any)
        .id((d: any) => d.id)
        .distance(200))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(48));

    // Add links
    const link = root.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#6b7280")
      .attr("stroke-width", 2.5)
      .attr("marker-end", d => {
        switch(d.type) {
          case '1': return "url(#arrow-parent)";
          case '2': return "url(#arrow-child)";
          case '3': return "url(#arrow-sibling)";
          default: return "url(#arrow-default)";
        }
      });

    // Add link labels
    const linkLabel = root.append("g")
      .selectAll("text")
      .data(links)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#374151")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 3)
      .style("paint-order", "stroke fill")
      .text(d => d.label);

    // Add nodes
    const node = root.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    // Add circles
    node.append("circle")
      .attr("r", d => d.type === 'current' ? 32 : 26)
      .attr("fill", d => d.type === 'current' ? '#111827' : '#f3f4f6')
      .attr("stroke", d => d.type === 'current' ? '#0b1220' : '#9ca3af')
      .attr("stroke-width", 2.5);

    // Add labels
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", d => d.type === 'current' ? "14px" : "12px")
      .attr("font-weight", d => d.type === 'current' ? "600" : "400")
      .attr("fill", d => d.type === 'current' ? '#ffffff' : '#374151')
      .attr("stroke", d => d.type === 'current' ? '#111827' : '#ffffff')
      .attr("stroke-width", d => d.type === 'current' ? 0 : 3)
      .style("paint-order", "stroke fill")
      .text(d => {
        // Truncate long titles
        const maxLength = 22;
        return d.title.length > maxLength 
          ? d.title.substring(0, maxLength) + '...' 
          : d.title;
      });

    // Add tooltips
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("padding", "10px")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none");

    node.on("mouseover", (event, d: any) => {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`
        <div>
          <strong>${d.title}</strong><br/>
          <span style="color: #9ca3af">${d.iatiId}</span>
          ${d.relationshipLabel ? `<br/><span style="color: #60a5fa">Type: ${d.relationshipLabel}</span>` : ''}
        </div>
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition()
        .duration(500)
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

    svg.call(zoom as any);

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
      simulation.stop();
      tooltip.remove();
    };
  }, [currentActivity, linkedActivities]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default LinkedActivitiesGraph;
