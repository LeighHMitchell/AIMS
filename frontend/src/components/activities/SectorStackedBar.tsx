'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SectorAllocation, SectorGroup } from '@/types/sector';

interface SectorStackedBarProps {
  allocations: SectorAllocation[];
  width?: number;
  height?: number;
}

export default function SectorStackedBar({ 
  allocations, 
  width = 400, 
  height = 400 
}: SectorStackedBarProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || allocations.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Group allocations by DAC3 code
    const groupedData = d3.group(allocations, d => d.dac3_code);
    const dac3Groups: SectorGroup[] = Array.from(groupedData, ([dac3_code, allocs]) => {
      const firstAlloc = allocs[0];
      return {
        dac3_code,
        dac3_name: firstAlloc.dac3_name,
        allocations: allocs,
        totalPercentage: d3.sum(allocs, d => d.percentage)
      };
    }).sort((a, b) => b.totalPercentage - a.totalPercentage);

    // Set dimensions and margins
    const margin = { top: 20, right: 30, bottom: 80, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(dac3Groups.map(d => d.dac3_code))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(dac3Groups, d => d.totalPercentage) || 100])
      .nice()
      .range([innerHeight, 0]);

    // Color scale - muted grey-blue palette for better integration
    const mutedColors = [
      '#64748b', '#475569', '#334155', '#6b7280', '#4b5563', 
      '#374151', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6'
    ];
    const colorScale = d3.scaleOrdinal(mutedColors);
    const dac5ColorMap = new Map<string, string>();
    allocations.forEach((alloc, i) => {
      dac5ColorMap.set(alloc.dac5_code, mutedColors[i % mutedColors.length]);
    });

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'absolute invisible bg-gray-900 text-white p-2 rounded text-sm pointer-events-none z-50')
      .style('opacity', 0);

    // Draw stacked bars
    dac3Groups.forEach((group, groupIndex) => {
      let cumulativeHeight = 0;
      
      group.allocations.forEach((alloc, allocIndex) => {
        const barHeight = yScale(0) - yScale(alloc.percentage);
        
        g.append('rect')
          .attr('x', xScale(group.dac3_code)!)
          .attr('y', yScale(cumulativeHeight + alloc.percentage))
          .attr('width', xScale.bandwidth())
          .attr('height', barHeight)
          .attr('fill', dac5ColorMap.get(alloc.dac5_code)!)
          .attr('stroke', 'white')
          .attr('stroke-width', 1)
          .on('mouseover', function(event) {
            d3.select(this).transition().duration(200).attr('opacity', 0.8);
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip.html(`
              <div class="font-semibold">${alloc.dac5_code} - ${alloc.dac5_name}</div>
              <div class="text-xs opacity-75">DAC3: ${group.dac3_code} - ${group.dac3_name}</div>
              <div>Allocation: ${alloc.percentage.toFixed(1)}%</div>
            `)
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY - 10}px`)
              .classed('invisible', false);
          })
          .on('mouseout', function() {
            d3.select(this).transition().duration(200).attr('opacity', 1);
            tooltip.transition().duration(200).style('opacity', 0)
              .on('end', () => tooltip.classed('invisible', true));
          });
        
        cumulativeHeight += alloc.percentage;
      });
      
      // Add total label on top of each bar
      g.append('text')
        .attr('x', xScale(group.dac3_code)! + xScale.bandwidth() / 2)
        .attr('y', yScale(group.totalPercentage) - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(`${group.totalPercentage.toFixed(0)}%`);
    });

    // X-axis
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    xAxis.selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('font-size', '10px');

    // Y-axis
    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => `${d}%`));

    // Y-axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - innerHeight / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Percentage Allocation');

    // Legend
    const legendContainer = svg.append('g')
      .attr('transform', `translate(${width - 20}, ${margin.top})`);

    const legendItems = Array.from(dac5ColorMap.entries()).slice(0, 5); // Show first 5 items
    
    legendItems.forEach(([code, color], i) => {
      const legendRow = legendContainer.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendRow.append('rect')
        .attr('x', -15)
        .attr('y', 0)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', color);
      
      legendRow.append('text')
        .attr('x', -20)
        .attr('y', 10)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .text(code);
    });

    if (dac5ColorMap.size > 5) {
      legendContainer.append('text')
        .attr('x', -20)
        .attr('y', 110)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('font-style', 'italic')
        .text(`+${dac5ColorMap.size - 5} more`);
    }

    // Clean up tooltip on unmount
    return () => {
      d3.select('body').selectAll('.absolute.bg-gray-900').remove();
    };
  }, [allocations, width, height]);

  return (
    <div className="flex items-center justify-center h-full">
      <svg ref={svgRef}></svg>
    </div>
  );
} 