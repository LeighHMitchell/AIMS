'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SectorAllocation, SectorGroup } from '@/types/sector';

interface SectorDonutChartProps {
  allocations: SectorAllocation[];
  width?: number;
  height?: number;
}

export default function SectorDonutChart({ 
  allocations, 
  width = 400, 
  height = 400 
}: SectorDonutChartProps) {
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
    });

    // Set dimensions and margins
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;
    const innerRadius = radius * 0.5;
    const outerRadius = radius * 0.75;
    const outerOuterRadius = radius;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Color scale - muted grey-blue palette for better integration
    const mutedColors = [
      '#64748b', // slate-500
      '#475569', // slate-600
      '#334155', // slate-700
      '#6b7280', // gray-500
      '#4b5563', // gray-600
      '#374151', // gray-700
      '#1e40af', // blue-800
      '#1d4ed8', // blue-700
      '#2563eb', // blue-600
      '#3b82f6'  // blue-500
    ];
    const colorScale = d3.scaleOrdinal(mutedColors);

    // Create pie generators
    const innerPie = d3.pie<SectorGroup>()
      .value(d => d.totalPercentage)
      .sort(null);

    const outerPie = d3.pie<SectorAllocation>()
      .value(d => d.percentage)
      .sort(null);

    // Create arc generators
    const innerArc = d3.arc<d3.PieArcDatum<SectorGroup>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const outerArc = d3.arc<d3.PieArcDatum<SectorAllocation>>()
      .innerRadius(outerRadius)
      .outerRadius(outerOuterRadius);

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'absolute invisible bg-gray-900 text-white p-2 rounded text-sm pointer-events-none z-50')
      .style('opacity', 0);

    // Draw inner ring (DAC3)
    const innerG = g.append('g').attr('class', 'inner-ring');
    
    innerG.selectAll('path')
      .data(innerPie(dac3Groups))
      .enter().append('path')
      .attr('d', innerArc)
      .attr('fill', (d, i) => colorScale(i.toString()))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .on('mouseover', function(event, d) {
        d3.select(this).transition().duration(200).attr('opacity', 0.8);
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`
          <div class="font-semibold">${d.data.dac3_code} - ${d.data.dac3_name}</div>
          <div>Total: ${d.data.totalPercentage.toFixed(1)}%</div>
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

    // Draw outer ring (DAC5)
    const outerG = g.append('g').attr('class', 'outer-ring');
    
    // Create proper data structure for outer ring
    const outerData: { allocation: SectorAllocation; dac3Index: number }[] = [];
    dac3Groups.forEach((group, groupIndex) => {
      group.allocations.forEach(alloc => {
        outerData.push({ allocation: alloc, dac3Index: groupIndex });
      });
    });

    outerG.selectAll('path')
      .data(outerPie(outerData.map(d => d.allocation)))
      .enter().append('path')
      .attr('d', outerArc)
      .attr('fill', (d, i) => {
        const groupIndex = outerData[i].dac3Index;
        return d3.color(colorScale(groupIndex.toString()))!.brighter(0.3).toString();
      })
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .on('mouseover', function(event, d) {
        d3.select(this).transition().duration(200).attr('opacity', 0.8);
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`
          <div class="font-semibold">${d.data.dac5_code} - ${d.data.dac5_name}</div>
          <div class="text-xs opacity-75">DAC3: ${d.data.dac3_code} - ${d.data.dac3_name}</div>
          <div>Allocation: ${d.data.percentage.toFixed(1)}%</div>
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

    // Add center text
    const centerText = g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '24px')
      .style('font-weight', 'bold')
      .text(`${d3.sum(allocations, d => d.percentage).toFixed(0)}%`);

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