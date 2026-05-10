import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { APP_CONFIG } from '../appConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  owner: string | null;
  budget: number | null;
  progress: number;
  color: string;
}

interface Milestone {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'overdue';
  owner: string | null;
  budget: number | null;
  tasks: Task[];
}

interface Task {
  id: number;
  milestone_id: number;
  title: string;
  owner: string | null;
  status: 'todo' | 'in_progress' | 'done';
  due_date: string | null;
  budget: number | null;
  description?: string | null;
  duration_hours?: number;
  hourly_rate?: number;
}

// Mỗi row trong bảng phân quyền = 1 mục (project/roadmap/budget/manage)
// Mỗi role có 4 quyền: xem, thêm, sửa, xóa
interface RolePerms {
  can_read:   boolean;
  can_add:    boolean;
  can_edit:   boolean;
  can_delete: boolean;
}

// key = role name, value = 4 quyền
type RoadMapSettings = Record<string, Record<string, RolePerms>>;
// shape: { projects: { admin: {can_read,can_add,...}, staff: {...} }, roadmap: {...}, ... }

type TabId = 'projects' | 'roadmap' | 'settings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_PROJECT: Record<Project['status'], { label: string; color: string; bg: string }> = {
  planning:  { label: 'Lên kế hoạch', color: '#64748b', bg: 'bg-slate-100 text-slate-600' },
  active:    { label: 'Đang thực hiện', color: '#3b82f6', bg: 'bg-blue-100 text-blue-700' },
  on_hold:   { label: 'Tạm dừng',      color: '#f59e0b', bg: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Hoàn thành',    color: '#10b981', bg: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Đã hủy',        color: '#ef4444', bg: 'bg-rose-100 text-rose-700' },
};

const STATUS_MILESTONE: Record<Milestone['status'], { label: string; icon: string; color: string }> = {
  todo:        { label: 'Chưa bắt đầu', icon: 'radio_button_unchecked', color: 'text-slate-400' },
  in_progress: { label: 'Đang làm',     icon: 'pending',                 color: 'text-blue-500' },
  done:        { label: 'Hoàn thành',   icon: 'check_circle',            color: 'text-emerald-500' },
  overdue:     { label: 'Quá hạn',      icon: 'error',                   color: 'text-rose-500' },
};

const STATUS_TASK: Record<Task['status'], { label: string; color: string }> = {
  todo:        { label: 'Chưa làm', color: 'bg-slate-100 text-slate-500' },
  in_progress: { label: 'Đang làm', color: 'bg-blue-100 text-blue-600' },
  done:        { label: 'Xong',     color: 'bg-emerald-100 text-emerald-700' },
};

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : `${n}`;

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const fmtDueDay = (dateStr: string | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()] || 'May';
  return `${day}-${month}`;
};

// ─── All Roles (for settings tab) ────────────────────────────────────────────

const ALL_ROLES = [
  { name: 'super_admin', label: 'Super Admin',  color: '#ef4444' },
  { name: 'admin',       label: 'Quản trị',     color: '#f59e0b' },
  { name: 'leader',      label: 'Trưởng nhóm',  color: '#8b5cf6' },
  { name: 'staff',       label: 'Nhân viên',    color: '#3b82f6' },
  { name: 'customer',    label: 'Khách hàng',   color: '#64748b' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{ width: `${value}%`, backgroundColor: color }}
    />
  </div>
);

// ─── Tab: Project List ────────────────────────────────────────────────────────

const TabProjects: React.FC<{
  projects: Project[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  canViewBudget: boolean;
}> = ({ projects, selectedId, onSelect, canViewBudget }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-lg font-bold text-slate-800">Danh sách Project</h2>
      <span className="text-xs text-slate-400 font-semibold">{projects.length} project</span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map(p => {
        const st = STATUS_PROJECT[p.status];
        const isSelected = selectedId === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`text-left p-5 rounded-2xl border-2 transition-all shadow-sm hover:shadow-md ${
              isSelected
                ? 'border-blue-400 bg-blue-50 shadow-blue-100'
                : 'border-slate-100 bg-white hover:border-slate-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{p.code}</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${st.bg}`}>{st.label}</span>
            </div>

            <h3 className="font-bold text-slate-800 text-[15px] leading-snug mb-1">{p.name}</h3>
            {p.description && (
              <p className="text-xs text-slate-500 line-clamp-2 mb-3">{p.description}</p>
            )}

            {/* Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                <span>Tiến độ</span>
                <span style={{ color: p.color }}>{p.progress}%</span>
              </div>
              <ProgressBar value={p.progress} color={p.color} />
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <span className="material-icons-round text-[13px]">person</span>
                <span>{p.owner || '—'}</span>
              </div>
              {canViewBudget && (
                <div className="flex items-center gap-1">
                  <span className="material-icons-round text-[13px]">payments</span>
                  <span className="font-semibold text-emerald-600">{fmt(p.budget || 0)}đ</span>
                </div>
              )}
              <div className="flex items-center gap-1 col-span-2">
                <span className="material-icons-round text-[13px]">calendar_today</span>
                <span>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Tab: Road Map ────────────────────────────────────────────────────────────

const TabRoadMap: React.FC<{
  projects: Project[];
  milestones: Milestone[];
  selectedProjectId: number | null;
  canViewBudget: boolean;
  onRefresh: () => void;
}> = ({ projects, milestones, selectedProjectId, canViewBudget, onRefresh }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Form states
  const [formMilestoneId, setFormMilestoneId] = useState<number>(0);
  const [formTitle, setFormTitle] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formStatus, setFormStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [formDuration, setFormDuration] = useState<number>(0);
  const [formHourlyRate, setFormHourlyRate] = useState<number>(800000);
  const [formDescription, setFormDescription] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const filteredMilestones = selectedProjectId
    ? milestones.filter(m => m.project_id === selectedProjectId)
    : milestones;

  const sortedMilestones = [...filteredMilestones]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // Gather and format all tasks across milestones for the timeline
  const allTasks: {
    task: Task;
    phaseCode: string;
    phaseNum: number;
  }[] = [];

  sortedMilestones.forEach((ms) => {
    const isPhase2 = ms.title.toLowerCase().includes('phase 2') || ms.sort_order === 2;
    const phaseCode = isPhase2 ? 'P2' : 'P1';
    const phaseNum = isPhase2 ? 2 : 1;
    const sortedTasks = [...ms.tasks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    sortedTasks.forEach(t => {
      allTasks.push({
        task: t,
        phaseCode,
        phaseNum
      });
    });
  });

  const p1Count = allTasks.filter(x => x.phaseNum === 1).length;
  const p2Count = allTasks.filter(x => x.phaseNum === 2).length;

  const project = projects.find(p => p.id === selectedProjectId);

  // Set default milestone ID when form opens
  useEffect(() => {
    if (sortedMilestones.length > 0 && !formMilestoneId) {
      setFormMilestoneId(sortedMilestones[0].id);
    }
  }, [sortedMilestones]);

  const handleOpenForm = (task: Task | null = null) => {
    if (task) {
      setEditingTask(task);
      setFormMilestoneId(task.milestone_id);
      setFormTitle(task.title);
      setFormDueDate(task.due_date ? task.due_date.substring(0, 10) : '');
      setFormOwner(task.owner || '');
      setFormStatus(task.status);
      setFormDuration(task.duration_hours || 0);
      setFormHourlyRate(task.hourly_rate || 800000);
      setFormDescription(task.description || '');
    } else {
      setEditingTask(null);
      if (sortedMilestones.length > 0) {
        setFormMilestoneId(sortedMilestones[0].id);
      }
      setFormTitle('');
      setFormDueDate(new Date().toISOString().substring(0, 10));
      setFormOwner('Huy');
      setFormStatus('todo');
      setFormDuration(0);
      setFormHourlyRate(800000);
      setFormDescription('');
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTask(true);
    try {
      // Calculate budget = duration * hourly_rate
      const calculatedBudget = formDuration * formHourlyRate;

      const payload = {
        milestone_id: formMilestoneId,
        title: formTitle,
        due_date: formDueDate || null,
        owner: formOwner || null,
        status: formStatus,
        duration_hours: formDuration,
        hourly_rate: formHourlyRate,
        description: formDescription || null,
        budget: calculatedBudget,
      };

      if (editingTask) {
        // Update task
        await supabase
          .from('esc_roadmap_tasks')
          .update(payload)
          .eq('id', editingTask.id);
      } else {
        // Create task
        await supabase
          .from('esc_roadmap_tasks')
          .insert([payload]);
      }

      // Refresh list, show toast, and close form
      onRefresh();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
      handleCloseForm();
    } catch (err) {
      console.error('Lỗi khi lưu task:', err);
    } finally {
      setSavingTask(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── PART 1: TIMELINE (Suggested Image style) ────────────────────── */}
      <div className="bg-[#fffdf5] rounded-2xl border border-amber-100/50 p-6 shadow-sm overflow-hidden">
        {/* Timeline Label */}
        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-amber-800/80 uppercase tracking-wider">
          <span className="material-icons-round text-sm">timeline</span>
          <span>Timeline</span>
        </div>

        {allTasks.length > 0 ? (
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[900px] px-4">
              {/* Phase Banners Row */}
              <div 
                className="grid gap-2.5 mb-6" 
                style={{ gridTemplateColumns: `repeat(${allTasks.length}, minmax(0, 1fr))` }}
              >
                {p1Count > 0 && (
                  <div 
                    className="bg-[#2563eb] text-white font-extrabold py-2 rounded-lg text-center text-xs uppercase tracking-widest shadow-sm"
                    style={{ gridColumn: `span ${p1Count} / span ${p1Count}` }}
                  >
                    Phase 1
                  </div>
                )}
                {p2Count > 0 && (
                  <div 
                    className="bg-[#ea580c] text-white font-extrabold py-2 rounded-lg text-center text-xs uppercase tracking-widest shadow-sm"
                    style={{ gridColumn: `span ${p2Count} / span ${p2Count}` }}
                  >
                    Phase 2
                  </div>
                )}
              </div>

              {/* Milestone Node Points & Green Connection Line */}
              <div className="relative mb-6">
                {/* Horizontal green connection line */}
                <div 
                  className="absolute top-1.5 h-[3px] bg-[#10b981]" 
                  style={{ 
                    left: `${50 / allTasks.length}%`, 
                    right: `${50 / allTasks.length}%` 
                  }}
                />

                {/* Dots Row */}
                <div 
                  className="grid relative z-10"
                  style={{ gridTemplateColumns: `repeat(${allTasks.length}, minmax(0, 1fr))` }}
                >
                  {allTasks.map((item) => {
                    const isDone = item.task.status === 'done';
                    const isProcessing = item.task.status === 'in_progress';
                    return (
                      <div key={item.task.id} className="flex flex-col items-center">
                        <div 
                          className={`w-3.5 h-3.5 rounded-full border-2 bg-white flex items-center justify-center transition-all duration-300 ${
                            isDone ? 'border-[#10b981] ring-4 ring-emerald-100' : 
                            isProcessing ? 'border-amber-400 ring-4 ring-amber-100' : 'border-slate-300'
                          }`}
                        >
                          <div 
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDone ? 'bg-[#10b981]' : 
                              isProcessing ? 'bg-amber-400' : 'bg-slate-300'
                            }`} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dates and Titles Row */}
              <div 
                className="grid gap-3 text-center"
                style={{ gridTemplateColumns: `repeat(${allTasks.length}, minmax(0, 1fr))` }}
              >
                {allTasks.map((item) => (
                  <div key={item.task.id} className="space-y-1 px-1 min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 tracking-tight">
                      {fmtDueDay(item.task.due_date)}
                    </p>
                    <p className="text-[11px] font-bold text-slate-600 leading-snug line-clamp-2 hover:line-clamp-none transition-all cursor-default">
                      {item.task.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs font-semibold">Chưa có nhiệm vụ nào trên timeline</div>
        )}
      </div>

      {/* ─── PART 2: DETAILED MILESTONES & COSTS table ────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Table Header Row */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-blue-500">assignment_turned_in</span>
            <h2 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase">Detailed Milestones & Costs</h2>
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="material-icons-round text-base">add</span>
            Thêm nhiệm vụ
          </button>
        </div>

        {/* The Data Table */}
        <div className="overflow-x-auto">
          {allTasks.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                  <th className="py-3 px-4 text-center w-12">No.</th>
                  <th className="py-3 px-4 text-center w-16">Phase</th>
                  <th className="py-3 px-4 min-w-[200px]">Task Name</th>
                  <th className="py-3 px-4 text-center w-24">Date</th>
                  <th className="py-3 px-4 min-w-[320px]">Description</th>
                  <th className="py-3 px-4 w-32">Owner</th>
                  <th className="py-3 px-4 text-center w-28">Status</th>
                  <th className="py-3 px-4 text-center w-20">Time</th>
                  <th className="py-3 px-4 text-right w-36">Head Cost</th>
                  <th className="py-3 px-4 text-center w-16">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allTasks.map((item, idx) => {
                  const isDone = item.task.status === 'done';
                  const isProcessing = item.task.status === 'in_progress';
                  return (
                    <tr key={item.task.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* NO */}
                      <td className="py-4 px-4 text-center text-xs font-extrabold text-slate-500">{idx + 1}</td>
                      
                      {/* PHASE */}
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shadow-sm ${
                            item.phaseNum === 2 ? 'bg-[#f97316]' : 'bg-[#2563eb]'
                          }`}>
                            {item.phaseCode}
                          </div>
                        </div>
                      </td>

                      {/* TASK NAME */}
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-slate-800 text-sm leading-snug">
                          {item.task.title}
                        </span>
                      </td>

                      {/* DATE */}
                      <td className="py-4 px-4 text-center text-xs font-extrabold text-slate-500">
                        {fmtDueDay(item.task.due_date)}
                      </td>

                      {/* DESCRIPTION */}
                      <td className="py-4 px-4 text-xs font-medium text-slate-600">
                        {item.task.description ? (
                          <div className="space-y-1.5 max-w-lg py-1">
                            {item.task.description.split('\n').map((line, lidx) => {
                              const trimmed = line.trim();
                              if (!trimmed) return null;
                              // Check if is sub-bullet like "a.", "b."
                              const isSub = line.startsWith('   ') || line.startsWith('\t') || /^[a-z]\./.test(trimmed);
                              return (
                                <div 
                                  key={lidx} 
                                  className={`leading-relaxed ${
                                    isSub ? 'pl-4 text-slate-400 font-normal' : 'text-slate-600 font-medium'
                                  }`}
                                >
                                  {trimmed}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Không có mô tả</span>
                        )}
                      </td>

                      {/* OWNER */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm">
                            {item.task.owner?.charAt(0).toUpperCase() || 'H'}
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{item.task.owner || 'Huy'}</span>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-4 text-center">
                        {isDone ? (
                          <span className="bg-[#15803d] text-white font-extrabold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
                            Done
                          </span>
                        ) : isProcessing ? (
                          <span className="bg-amber-400 text-white font-extrabold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
                            Processing
                          </span>
                        ) : (
                          <span className="bg-slate-300 text-slate-600 font-extrabold px-2 py-0.5 rounded text-[10px] tracking-wider uppercase">
                            Todo
                          </span>
                        )}
                      </td>

                      {/* TIME */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1 text-slate-500 text-xs font-semibold">
                          <span className="material-icons-round text-sm text-slate-400">schedule</span>
                          <span>{item.task.duration_hours ? `${item.task.duration_hours}h` : '—'}</span>
                        </div>
                      </td>

                      {/* HEAD COST */}
                      <td className="py-4 px-4 text-right">
                        {item.task.duration_hours && item.task.hourly_rate ? (
                          <div className="inline-block text-right">
                            <div className="text-[10px] text-slate-400 font-bold mb-0.5 uppercase tracking-wider">
                              {new Intl.NumberFormat('vi-VN').format(item.task.hourly_rate)}đ x {item.task.duration_hours}h
                            </div>
                            <div className="text-rose-600 font-extrabold text-xs">
                              {new Intl.NumberFormat('vi-VN').format(item.task.duration_hours * item.task.hourly_rate)}đ
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* EDIT ACTION */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleOpenForm(item.task)}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-all active:scale-95"
                        >
                          <span className="material-icons-round text-sm">edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs font-semibold">Chưa có nhiệm vụ nào</div>
          )}
        </div>
      </div>

      {/* Success Toast Notification */}
      {showToast && (
        <div className="fixed inset-0 flex items-center justify-center z-[120] pointer-events-none">
          <div className="bg-slate-900/95 backdrop-blur-sm text-white px-5 py-3 rounded-2xl flex items-center gap-2.5 shadow-2xl transition-all duration-300">
            <span className="material-icons-round text-emerald-400 text-xl">check_circle</span>
            <span className="text-sm font-bold tracking-wide">Cập nhật nhiệm vụ thành công!</span>
          </div>
        </div>
      )}

      {/* Slide-over / Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="material-icons-round text-blue-500 text-lg">{editingTask ? 'edit_note' : 'add_task'}</span>
                {editingTask ? 'Cập nhật nhiệm vụ' : 'Thêm nhiệm vụ mới'}
              </h3>
              <button 
                onClick={handleCloseForm}
                className="text-slate-400 hover:text-slate-600 rounded-full w-8 h-8 flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {/* Milestone Selection */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Milestone (Phase)</label>
                <select
                  required
                  value={formMilestoneId}
                  onChange={(e) => setFormMilestoneId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {sortedMilestones.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Tên nhiệm vụ</label>
                <input
                  required
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Nhập tên nhiệm vụ..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Due Date & Owner */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Hạn hoàn thành</label>
                  <input
                    required
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Người phụ trách</label>
                  <input
                    required
                    type="text"
                    value={formOwner}
                    onChange={(e) => setFormOwner(e.target.value)}
                    placeholder="Ví dụ: Huy"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Status, Duration & Hourly Rate */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Trạng thái</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="todo">TODO</option>
                    <option value="in_progress">PROCESSING</option>
                    <option value="done">DONE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Thời gian (Giờ)</label>
                  <input
                    type="number"
                    min="0"
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Đơn giá / giờ</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formHourlyRate}
                    onChange={(e) => setFormHourlyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Description / Subtasks List */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Mô tả công việc (Mỗi dòng là một mục)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={4}
                  placeholder="Ví dụ:&#10;1. Thiết kế website VDP theo phong cách XNK&#10;2. Thiết kế trang quản trị dành cho admin"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-md shadow-blue-200 flex items-center gap-1.5 text-xs disabled:opacity-50"
                >
                  <span className="material-icons-round text-base">{savingTask ? 'sync' : 'save'}</span>
                  {savingTask ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Cài đặt (bảng phân quyền CRUD) ────────────────────────────────────

const SECTIONS = [
  { key: 'projects', label: 'Project List', icon: 'folder_open',          desc: 'Danh sách dự án' },
  { key: 'roadmap',  label: 'Road Map',     icon: 'account_tree',         desc: 'Timeline, milestone, task' },
  { key: 'budget',   label: 'Ngân sách',    icon: 'payments',             desc: 'Thông tin budget & chi phí' },
  { key: 'manage',   label: 'Quản lý',      icon: 'admin_panel_settings', desc: 'Cài đặt & cấu hình' },
];

const CRUD_COLS: { key: keyof RolePerms; label: string; icon: string; color: string }[] = [
  { key: 'can_read',   label: 'Xem',  icon: 'visibility', color: 'text-blue-500'    },
  { key: 'can_add',    label: 'Thêm', icon: 'add_circle', color: 'text-emerald-500' },
  { key: 'can_edit',   label: 'Sửa',  icon: 'edit',       color: 'text-amber-500'   },
  { key: 'can_delete', label: 'Xóa',  icon: 'delete',     color: 'text-rose-500'    },
];

// 4 icon trong 1 ô, mỗi icon = 1 quyền
const RoleCrudCell: React.FC<{
  perms: RolePerms;
  disabled?: boolean;
  onToggle: (perm: keyof RolePerms) => void;
}> = ({ perms, disabled, onToggle }) => (
  <div className="flex items-center justify-center gap-1 py-3">
    {CRUD_COLS.map(col => {
      const active = perms[col.key];
      return (
        <button
          key={col.key}
          title={col.label}
          onClick={disabled ? undefined : () => onToggle(col.key)}
          disabled={disabled}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
            ${disabled ? 'cursor-not-allowed' : 'hover:scale-110 active:scale-95 cursor-pointer'}
            ${active ? 'bg-opacity-15' : 'opacity-20 hover:opacity-40'}
          `}
          style={active ? { backgroundColor: col.color.replace('text-', '').replace('-500','') + '18' } : {}}
        >
          <span className={`material-icons-round text-[18px] transition-colors ${active ? col.color : 'text-slate-300'}`}>
            {col.icon}
          </span>
        </button>
      );
    })}
  </div>
);

const TabSettings: React.FC<{
  settings: RoadMapSettings;
  onChange: (s: RoadMapSettings) => Promise<void>;
  isSuperAdmin: boolean;
}> = ({ settings, onChange, isSuperAdmin }) => {
  const [local, setLocal] = useState<RoadMapSettings>(settings);
  const [showToast, setShowToast] = useState(false);
  const [saving, setSaving] = useState(false);

  // sync khi settings từ DB load xong
  useEffect(() => { setLocal(settings); }, [settings]);

  const toggle = (secKey: string, roleName: string, perm: keyof RolePerms) => {
    const prev: RolePerms = local[secKey]?.[roleName] ?? { can_read: false, can_add: false, can_edit: false, can_delete: false };
    const next = { ...prev, [perm]: !prev[perm] };
    if ((perm === 'can_add' || perm === 'can_edit' || perm === 'can_delete') && !prev[perm]) next.can_read = true;
    if (perm === 'can_read' && prev.can_read) { next.can_add = false; next.can_edit = false; next.can_delete = false; }
    setLocal(s => ({ ...s, [secKey]: { ...s[secKey], [roleName]: next } }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onChange(local);
    setSaving(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <span className="material-icons-round text-5xl mb-3">lock</span>
        <p className="font-bold text-slate-600">Chỉ Super Admin mới được cấu hình</p>
        <p className="text-sm mt-1">Liên hệ Super Admin để thay đổi quyền truy cập Road Map</p>
      </div>
    );
  }

  const displayRoles = ALL_ROLES.filter(role => role.name !== 'super_admin');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">Phân quyền Road Map theo Role</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Tick vào ô để cấp quyền cho từng role trên từng mục</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 sm:px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-colors shadow-md shadow-blue-100 text-xs sm:text-sm flex-shrink-0"
        >
          <span className="material-icons-round text-[16px] sm:text-[18px]">{saving ? 'hourglass_top' : 'save'}</span>
          <span className="hidden sm:inline">Lưu cấu hình</span>
          <span className="sm:hidden">Lưu</span>
        </button>
      </div>

      {/* Bảng — overflow-x-auto để scroll ngang trên mobile */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        {/* Header row: Mục | Role × 4 */}
        <div className="grid bg-slate-50 border-b-2 border-slate-100"
          style={{ gridTemplateColumns: `180px repeat(${displayRoles.length}, 1fr)` }}>
          <div className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mục</div>
          {displayRoles.map(role => (
            <div key={role.name} className="py-3 text-center">
              <span className="text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full"
                style={{ backgroundColor: role.color + '20', color: role.color }}>
                {role.label}
              </span>
            </div>
          ))}
        </div>

        {/* Section rows — mỗi section = 1 hàng */}
        {SECTIONS.map((sec, si) => (
          <div key={sec.key}
            className={`grid items-center hover:bg-slate-50/40 transition-colors ${si > 0 ? 'border-t border-slate-100' : ''}`}
            style={{ gridTemplateColumns: `180px repeat(${displayRoles.length}, 1fr)` }}>
            {/* Tên mục */}
            <div className="px-4 py-3 flex items-center gap-2">
              <span className="material-icons-round text-blue-400 text-[16px]">{sec.icon}</span>
              <div>
                <p className="text-[13px] font-extrabold text-slate-700 leading-tight">{sec.label}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{sec.desc}</p>
              </div>
            </div>
            {/* 4 icon CRUD cho mỗi role */}
            {displayRoles.map(role => {
              const p: RolePerms = local[sec.key]?.[role.name] ?? { can_read: false, can_add: false, can_edit: false, can_delete: false };
              return (
                <RoleCrudCell
                  key={role.name}
                  perms={p}
                  disabled={role.name === 'super_admin'}
                  onToggle={(perm: keyof RolePerms) => toggle(sec.key, role.name, perm)}
                />
              );
            })}
          </div>
        ))}
        </div>{/* end overflow-x-auto */}
      </div>{/* end bảng */}

      {/* Legend */}
      <div className="flex flex-wrap gap-5 text-xs text-slate-400">
        {CRUD_COLS.map(col => (
          <span key={col.key} className="flex items-center gap-1">
            <span className={`material-icons-round text-[14px] ${col.color}`}>{col.icon}</span>{col.label}
          </span>
        ))}
        <span className="ml-4 flex items-center gap-1 text-slate-300 italic">Super Admin luôn có toàn quyền</span>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-sm text-white px-5 py-3 rounded-2xl flex items-center gap-2.5 shadow-2xl">
            <span className="material-icons-round text-emerald-400 text-xl">check_circle</span>
            <span className="text-sm font-bold">Đã lưu phân quyền thành công!</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface RoadMapProps {
  user: { isSuperAdmin: boolean; roleName?: string | null } | null;
}

const buildDefaultSettings = (): RoadMapSettings => {
  const result: RoadMapSettings = {};
  for (const sec of SECTIONS) {
    result[sec.key] = {};
    for (const role of ALL_ROLES) {
      if (role.name === 'super_admin') {
        result[sec.key][role.name] = { can_read: true, can_add: true, can_edit: true, can_delete: true };
      } else if (role.name === 'admin') {
        result[sec.key][role.name] = { can_read: true, can_add: true, can_edit: true, can_delete: sec.key !== 'manage' };
      } else if (role.name === 'leader') {
        result[sec.key][role.name] = { can_read: sec.key !== 'budget' && sec.key !== 'manage', can_add: false, can_edit: false, can_delete: false };
      } else {
        result[sec.key][role.name] = { can_read: sec.key === 'projects' || sec.key === 'roadmap', can_add: false, can_edit: false, can_delete: false };
      }
    }
  }
  return result;
};

const DEFAULT_SETTINGS: RoadMapSettings = buildDefaultSettings();

const RoadMap: React.FC<RoadMapProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<TabId>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [settings, setSettings] = useState<RoadMapSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [triggerReload, setTriggerReload] = useState(0);

  const reloadData = () => setTriggerReload(prev => prev + 1);

  const isSuperAdmin = user?.isSuperAdmin === true;
  const roleName = user?.roleName || 'staff';

  // ── Load data from DB ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Load settings (lưu dạng JSON trong cột permissions_json)
        const { data: settingsData } = await supabase
          .from('esc_roadmap_settings')
          .select('permissions_json')
          .eq('website_id', APP_CONFIG.WEBSITE_ID)
          .single();
        if (settingsData?.permissions_json) {
          setSettings(settingsData.permissions_json as RoadMapSettings);
        }

        // Load projects
        const { data: projectsData } = await supabase
          .from('esc_roadmap_projects')
          .select('*')
          .contains('website_id', [APP_CONFIG.WEBSITE_ID])
          .order('id');
        const loadedProjects = (projectsData || []) as Project[];
        setProjects(loadedProjects);
        if (loadedProjects.length > 0 && selectedProjectId === null) {
          setSelectedProjectId(loadedProjects[0].id);
        }

        // Load milestones + tasks
        const { data: msData } = await supabase
          .from('esc_roadmap_milestones')
          .select('*, tasks:esc_roadmap_tasks(*)')
          .order('sort_order');
        setMilestones((msData || []).map((m: any) => ({
          ...m,
          tasks: (m.tasks || []).sort((a: Task, b: Task) => (a as any).sort_order - (b as any).sort_order),
        })) as Milestone[]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [triggerReload]);

  // ── Save settings to DB ────────────────────────────────────
  const handleSaveSettings = async (next: RoadMapSettings) => {
    setSettings(next);
    await supabase
      .from('esc_roadmap_settings')
      .update({ permissions_json: next, updated_at: new Date().toISOString() })
      .eq('website_id', APP_CONFIG.WEBSITE_ID);
  };

  const canViewProjects = isSuperAdmin || settings['projects']?.[roleName]?.can_read === true;
  const canViewRoadmap  = isSuperAdmin || settings['roadmap']?.[roleName]?.can_read === true;
  const canViewBudget   = isSuperAdmin || settings['budget']?.[roleName]?.can_read === true;
  const canViewSettings = isSuperAdmin;

  const TABS: { id: TabId; label: string; icon: string; visible: boolean }[] = [
    { id: 'projects',  label: 'Project List', icon: 'folder_open',          visible: canViewProjects },
    { id: 'roadmap',   label: 'Road Map',      icon: 'account_tree',         visible: canViewRoadmap },
    { id: 'settings',  label: 'Cài đặt',       icon: 'admin_panel_settings', visible: canViewSettings },
  ];

  const visibleTabs = TABS.filter(t => t.visible);

  useEffect(() => {
    if (!visibleTabs.find(t => t.id === activeTab) && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [roleName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm font-medium">Đang tải Road Map...</span>
        </div>
      </div>
    );
  }

  if (!canViewProjects && !canViewRoadmap && !canViewSettings) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 text-slate-400">
        <span className="material-icons-round text-6xl mb-4">lock</span>
        <p className="font-bold text-slate-600 text-lg">Không có quyền truy cập</p>
        <p className="text-sm mt-1">Liên hệ quản trị viên để được cấp quyền xem Road Map</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
            <span className="material-icons-round text-white text-xl">map</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Road Map</h1>
            <p className="text-sm text-slate-400">Theo dõi tiến độ dự án, milestone và ngân sách</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-icons-round text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'projects' && canViewProjects && (
        <TabProjects
          projects={projects}
          selectedId={selectedProjectId}
          onSelect={setSelectedProjectId}
          canViewBudget={canViewBudget}
        />
      )}

      {activeTab === 'roadmap' && canViewRoadmap && (
        <TabRoadMap
          projects={projects}
          milestones={milestones}
          selectedProjectId={selectedProjectId}
          canViewBudget={canViewBudget}
          onRefresh={reloadData}
        />
      )}

      {activeTab === 'settings' && (
        <TabSettings
          settings={settings}
          onChange={handleSaveSettings}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
};

export default RoadMap;
