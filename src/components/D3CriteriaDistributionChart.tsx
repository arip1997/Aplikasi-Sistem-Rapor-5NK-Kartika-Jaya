import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Student, Category, ScoreKey } from '../types';
import { Award, Sparkles } from 'lucide-react';

interface D3ChartProps {
  students: Student[];
  categories: Category[];
}

interface CriteriaData {
  id: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  hoverColor: string;
}

export default function D3CriteriaDistributionChart({ students, categories }: D3ChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Compute criteria data from active students
  const data = useMemo<CriteriaData[]>(() => {
    let bsbCount = 0;
    let bCount = 0;
    let mbCount = 0;
    let bbCount = 0;

    students.forEach((s) => {
      if (!s.grades) return;
      Object.values(s.grades).forEach((grade) => {
        if (grade === 'BSB') bsbCount++;
        else if (grade === 'B') bCount++;
        else if (grade === 'MB') mbCount++;
        else if (grade === 'BB') bbCount++;
      });
    });

    const total = bsbCount + bCount + mbCount + bbCount || 1;

    return [
      { 
        id: 'BSB', 
        label: 'BSB (Berkembang Sangat Baik)', 
        count: bsbCount, 
        percentage: Math.round((bsbCount / total) * 100),
        color: '#10b981', // emerald-500
        hoverColor: '#059669' // emerald-600
      },
      { 
        id: 'B', 
        label: 'B (Berkembang Sesuai Harapan)', 
        count: bCount, 
        percentage: Math.round((bCount / total) * 100),
        color: '#3b82f6', // blue-500
        hoverColor: '#2563eb' // blue-600
      },
      { 
        id: 'MB', 
        label: 'MB (Mulai Berkembang)', 
        count: mbCount, 
        percentage: Math.round((mbCount / total) * 100),
        color: '#f59e0b', // amber-500
        hoverColor: '#d97706' // amber-600
      },
      { 
        id: 'BB', 
        label: 'BB (Belum Berkembang)', 
        count: bbCount, 
        percentage: Math.round((bbCount / total) * 100),
        color: '#ef4444', // red-500
        hoverColor: '#dc2626' // red-600
      }
    ];
  }, [students]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous SVG content to avoid appending multiple times on re-renders
    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll('*').remove();

    // Get wrapper dimensions
    const width = containerRef.current.clientWidth || 500;
    const height = 250;
    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Attach dimensions
    svgElement
      .attr('width', width)
      .attr('height', height);

    // Create main grouping
    const g = svgElement.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale
    const x = d3.scaleBand()
      .domain(data.map(d => d.id))
      .range([0, chartWidth])
      .padding(0.35);

    // Y Scale
    const maxVal = d3.max(data, (d: CriteriaData) => d.count) || 10;
    const yMax = Math.ceil(maxVal * 1.15) || 5; // Give headroom for labels
    
    const y = d3.scaleLinear()
      .domain([0, yMax])
      .range([chartHeight, 0]);

    // Gridlines (Y axis)
    g.append('g')
      .attr('class', 'grid-lines')
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0.2)
      .call((d3.axisLeft(y)
        .tickSize(-chartWidth)
        .tickFormat(() => '') as any)
      )
      .selectAll('.domain').remove();

    // Draw bars
    const bars = g.selectAll('.bar')
      .data(data as any[])
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: any) => x(d.id) || 0)
      .attr('y', chartHeight) // Animation start at bottom
      .attr('width', x.bandwidth())
      .attr('height', 0) // Animation start with 0 height
      .attr('fill', (d: any) => d.color)
      .attr('rx', 6) // Smooth rounded pill corners
      .attr('ry', 6)
      .style('cursor', 'pointer');

    // Tooltip selection
    const tooltip = d3.select('#d3-bar-tooltip');

    // Add interactions
    bars
      .on('mouseover', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('fill', d.hoverColor)
          .attr('filter', 'drop-shadow(0px 4px 6px rgba(0,0,0,0.15))');

        tooltip
          .transition()
          .duration(100)
          .style('opacity', 1);

        tooltip.html(`
          <div class="px-3 py-2 bg-slate-900 text-white rounded-lg shadow-xl border border-slate-700 text-xs font-sans">
            <p class="font-extrabold text-indigo-400">${d.label}</p>
            <p class="mt-1 flex items-center justify-between gap-4">Jumlah: <span class="font-mono text-emerald-400 font-bold">${d.count} entri</span></p>
            <p class="flex items-center justify-between gap-4">Persentase: <span class="font-mono text-cyan-400 font-bold">${d.percentage}%</span></p>
          </div>
        `);
      })
      .on('mousemove', function(event) {
        const [xPos, yPos] = d3.pointer(event, document.body);
        tooltip
          .style('left', (xPos + 15) + 'px')
          .style('top', (yPos - 15) + 'px');
      })
      .on('mouseout', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', d.color)
          .attr('filter', null);

        tooltip
          .transition()
          .duration(150)
          .style('opacity', 0);
      });

    // Animation transition
    bars.transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .attr('y', (d: any) => y(d.count))
      .attr('height', (d: any) => chartHeight - y(d.count));

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call((d3.axisBottom(x).tickSize(0) as any))
      .call(g => g.select('.domain').remove()) // Hide line
      .selectAll('text')
      .attr('class', 'font-semibold text-slate-500 font-sans text-[11px]')
      .attr('dy', '1em');

    // Y Axis
    g.append('g')
      .call((d3.axisLeft(y).ticks(5).tickSize(0) as any))
      .call(g => g.select('.domain').remove()) // Hide line
      .selectAll('text')
      .attr('class', 'font-sans text-slate-400 text-[10px]')
      .attr('dx', '-0.5em');

    // Add inline counts above the bars
    g.selectAll('.bar-label')
      .data(data as any[])
      .enter()
      .append('text')
      .attr('class', 'bar-label font-mono font-bold text-[11px]')
      .attr('x', (d: any) => (x(d.id) || 0) + x.bandwidth() / 2)
      .attr('y', chartHeight)
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569') // slate-700
      .attr('opacity', 0)
      .text((d: any) => d.count > 0 ? d.count : '')
      .transition()
      .duration(800)
      .delay((d, i) => i * 100 + 300)
      .attr('y', (d: any) => y(d.count) - 8)
      .attr('opacity', 1);

    // Auto-resize handler
    const handleResize = () => {
      if (!containerRef.current || !svgRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      svgElement.attr('width', newWidth);
      const newChartWidth = newWidth - margin.left - margin.right;
      x.range([0, newChartWidth]);
      
      svgElement.select('.grid-lines').selectAll('g').remove();
      svgElement.select('.grid-lines')
        .call((d3.axisLeft(y).tickSize(-newChartWidth).tickFormat(() => '') as any))
        .selectAll('.domain').remove();

      g.selectAll('.bar')
        .attr('x', (d: any) => x(d.id) || 0)
        .attr('width', x.bandwidth());

      g.selectAll('.bar-label')
        .attr('x', (d: any) => (x(d.id) || 0) + x.bandwidth() / 2);

      g.select('g[transform^="translate(0,"]').selectAll('g').remove();
      g.select('g[transform^="translate(0,"]')
        .call((d3.axisBottom(x).tickSize(0) as any))
        .call(g => g.select('.domain').remove())
        .selectAll('text')
        .attr('class', 'font-semibold text-slate-500 font-sans text-[11px]')
        .attr('dy', '1em');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  const totalEntries = useMemo(() => {
    return data.reduce((sum, d) => sum + d.count, 0);
  }, [data]);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1 px-1.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] uppercase font-bold flex items-center gap-1">
            <Award className="h-3 w-3" />
            D3 Engine
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Distribusi Frekuensi Capaian Komprehensif</span>
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          Siswa Aktif: <span className="font-bold text-slate-700">{students.length}</span> | Nilai Terisi: <span className="font-bold text-slate-700">{totalEntries}</span>
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center min-h-[220px]">
        {totalEntries > 0 ? (
          <svg ref={svgRef} className="mx-auto select-none"></svg>
        ) : (
          <div className="text-center py-10 italic text-[11px] text-slate-400 font-sans">
            <Sparkles className="h-5 w-5 mx-auto text-slate-300 animate-pulse mb-1.5" />
            Menunggu data penilaian terentri untuk memproyeksikan histogram D3.
          </div>
        )}

        {/* Global tooltip anchor for cursor tracking */}
        <div 
          id="d3-bar-tooltip" 
          className="fixed pointer-events-none z-[99999]" 
          style={{ opacity: 0, transition: 'opacity 0.15s ease' }}
        />
      </div>

      {/* Mini Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2 border-t border-slate-50 text-[10px] font-medium text-slate-500">
        {data.map((d) => (
          <div key={d.id} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: d.color }} />
            <span>{d.id} ({d.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
