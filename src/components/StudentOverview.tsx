import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Student, Category } from '../types';

interface Props {
  student: Student;
  allStudents: Student[];
  categories: Category[];
}

export function StudentOverview({ student, allStudents, categories }: Props) {
  const chartData = categories.map(c => {
    let score = 0;
    c.indicators.forEach(ind => {
      const s = student.grades[ind.id];
      score += s === 'BSB' ? 4 : s === 'B' ? 3 : s === 'MB' ? 2 : s === 'BB' ? 1 : 0;
    });
    
    let classScore = 0;
    allStudents.forEach(st => {
      c.indicators.forEach(ind => {
        const s = st.grades[ind.id];
        classScore += s === 'BSB' ? 4 : s === 'B' ? 3 : s === 'MB' ? 2 : s === 'BB' ? 1 : 0;
      });
    });
    const avg = classScore / (allStudents.length || 1);
    
    return {
      name: c.id, 
      Student: score,
      ClassAvg: Number(avg.toFixed(1))
    };
  });

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
      <h4 className="text-xs font-bold text-slate-700">Ringkasan Penguasaan 5NK</h4>
      <div className="h-32 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
            <RechartsTooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontSize: '11px' }}
              labelStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}
            />
            <Bar dataKey="Student" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={16} />
            <Bar dataKey="ClassAvg" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 mt-1">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-indigo-600"></div><span className="text-[10px] text-slate-600">Siswa</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-400"></div><span className="text-[10px] text-slate-600">Rata-rata Kelas</span></div>
      </div>
    </div>
  );
}
