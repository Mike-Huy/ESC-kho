import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { PageType } from '../types';

interface StaffProfileProps {
  staffId: number | null;
  onBack: () => void;
}

type StaffDetail = {
    // users table
    id: number;
    full_name: string;
    nick_name: string | null;
    phone: string;
    email: string | null;
    user_type: string;
    gender: string | null;
    dob: string | null;
    id_card: string | null;
    id_card_date: string | null;
    id_card_place: string | null;
    address: string | null;
    avatar: string | null;
    base_salary: number;
    created_at: string;
    // staff_profiles
    department: string | null;
    position: string | null;
    join_date: string | null;
    contract_type: string | null;
    contract_no: string | null;
    contract_start: string | null;
    contract_end: string | null;
    bhxh_no: string | null;
    bhyt_no: string | null;
    bhtn_no: string | null;
    insurance_enrolled_date: string | null;
    salary_detail: Record<string, number>;
    emergency_name: string | null;
    emergency_phone: string | null;
    emergency_rel: string | null;
    notes: string | null;
    is_super_admin: boolean;
};

type Transaction = {
    id: number;
    trans_date: string;
    amount: number;
    trans_type: string;
    description: string;
};

type Attendance = {
    id: number;
    work_date: string;
    check_in: string | null;
    check_out: string | null;
    status: string;
    is_late: boolean;
    late_fine: number;
};

const CONTRACT_LABELS: Record<string, string> = {
    probation: 'Thử việc',
    fixed: 'Có xác định thời hạn',
    indefinite: 'Không xác định thời hạn',
    parttime: 'Bán thời gian',
};

const SALARY_ITEMS = [
    { key: 'responsibility', label: 'Phụ cấp trách nhiệm' },
    { key: 'meal', label: 'Phụ cấp ăn trưa' },
    { key: 'transport', label: 'Phụ cấp đi lại' },
    { key: 'phone', label: 'Phụ cấp điện thoại' },
    { key: 'housing', label: 'Phụ cấp nhà ở' },
    { key: 'seniority', label: 'Thâm niên' },
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const formatCurrency = (val: number) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const formatDate = (val: string | null) => 
  val ? new Date(val).toLocaleDateString('vi-VN') : '—';

const formatTime = (val: string | null) => {
  if (!val) return '—';
  const d = new Date(val);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const StaffProfile: React.FC<StaffProfileProps> = ({ staffId, onBack }) => {
    const [staff, setStaff] = useState<StaffDetail | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'contract' | 'salary' | 'history' | 'attendance'>('personal');
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState<Partial<StaffDetail>>({});

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const loadStaff = useCallback(async () => {
        if (!staffId) return;
        setLoading(true);
        const { data: u } = await supabase
            .from('users')
            .select('*, staff_profiles(*)')
            .eq('id', staffId)
            .single();

        if (!u) { onBack(); return; }

        const sp = Array.isArray(u.staff_profiles) ? u.staff_profiles[0] : u.staff_profiles;
        const merged: StaffDetail = {
            id: u.id, full_name: u.full_name, nick_name: u.nick_name,
            phone: u.phone, email: u.email, user_type: u.user_type,
            gender: u.gender, dob: u.dob, id_card: u.id_card,
            id_card_date: u.id_card_date, id_card_place: u.id_card_place,
            address: u.address, avatar: u.avatar,
            base_salary: u.base_salary || 0, created_at: u.created_at,
            department: sp?.department || null, position: sp?.position || null,
            join_date: sp?.join_date || null,
            contract_type: sp?.contract_type || null,
            contract_no: sp?.contract_no || null,
            contract_start: sp?.contract_start || null,
            contract_end: sp?.contract_end || null,
            bhxh_no: sp?.bhxh_no || null, bhyt_no: sp?.bhyt_no || null,
            bhtn_no: sp?.bhtn_no || null,
            insurance_enrolled_date: sp?.insurance_enrolled_date || null,
            salary_detail: sp?.salary_detail || {},
            emergency_name: sp?.emergency_name || null,
            emergency_phone: sp?.emergency_phone || null,
            emergency_rel: sp?.emergency_rel || null,
            notes: sp?.notes || null,
            is_super_admin: sp?.is_super_admin || false,
        };
        setStaff(merged);
        setForm(merged);

        const { data: tx } = await supabase.from('hr_transactions')
            .select('*').eq('user_id', staffId).order('trans_date', { ascending: false });
        setTransactions(tx || []);

        const since = new Date(); since.setDate(since.getDate() - 30);
        const { data: att } = await supabase.from('hr_attendance')
            .select('*').eq('user_id', staffId)
            .gte('work_date', since.toISOString().split('T')[0])
            .order('work_date', { ascending: false });
        setAttendance(att || []);

        setLoading(false);
    }, [staffId, onBack]);

    useEffect(() => { loadStaff(); }, [loadStaff]);

    const handleSave = async () => {
        if (!staff) return;
        setSaving(true);
        const usersFields = {
            full_name: form.full_name, nick_name: form.nick_name,
            phone: form.phone, email: form.email, gender: form.gender,
            dob: form.dob || null, id_card: form.id_card,
            id_card_date: form.id_card_date || null,
            id_card_place: form.id_card_place, address: form.address,
            base_salary: form.base_salary || 0,
        };
        const profileFields = {
            user_id: staffId,
            department: form.department, position: form.position,
            join_date: form.join_date || null,
            contract_type: form.contract_type,
            contract_no: form.contract_no,
            contract_start: form.contract_start || null,
            contract_end: form.contract_end || null,
            bhxh_no: form.bhxh_no, bhyt_no: form.bhyt_no, bhtn_no: form.bhtn_no,
            insurance_enrolled_date: form.insurance_enrolled_date || null,
            salary_detail: form.salary_detail || {},
            emergency_name: form.emergency_name,
            emergency_phone: form.emergency_phone, emergency_rel: form.emergency_rel,
            notes: form.notes, updated_at: new Date().toISOString(),
        };

        const [r1, r2] = await Promise.all([
            supabase.from('users').update(usersFields).eq('id', staffId),
            supabase.from('staff_profiles').upsert(profileFields, { onConflict: 'user_id' }),
        ]);

        if (r1.error || r2.error) {
            showToast('❌ Lỗi khi lưu: ' + (r1.error?.message || r2.error?.message), false);
        } else {
            showToast('✅ Đã lưu thông tin nhân viên');
            setEditMode(false);
            loadStaff();
        }
        setSaving(false);
    };

    const setField = (key: keyof StaffDetail, value: any) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const setSalaryDetail = (key: string, value: number) =>
        setForm(prev => ({ ...prev, salary_detail: { ...(prev.salary_detail || {}), [key]: value } }));

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 40 }}>
            {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-slate-200" style={{ height: 80, borderRadius: 14 }} />)}
        </div>
    );
    if (!staff) return null;

    const totalAllowance = SALARY_ITEMS.reduce((s, item) => s + (form.salary_detail?.[item.key] || 0), 0);
    const grossSalary = (form.base_salary || 0) + totalAllowance;

    const TABS = [
        { id: 'personal', label: '👤 Cá nhân', icon: '👤' },
        { id: 'contract', label: '📋 Hợp đồng & Bảo hiểm', icon: '📋' },
        { id: 'salary', label: '💰 Cơ cấu lương', icon: '💰' },
        { id: 'history', label: '📊 Lịch sử Thu chi', icon: '📊' },
        { id: 'attendance', label: '⏰ Chấm công 30 ngày', icon: '⏰' },
    ] as const;

    return (
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50/50">
            <style>{`
                .taphoa-card { background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; transition: all 0.2s; border: 1px solid #e5e7eb; }
                .taphoa-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .card-body { padding: 24px; }
                .taphoa-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.25s; white-space: nowrap; }
                .taphoa-btn-primary { background: linear-gradient(135deg, #1e4fa0, #2563eb); color: #fff; box-shadow: 0 4px 20px rgba(37,99,235,0.25); }
                .taphoa-btn-outline { background: #fff; border: 2px solid #2563eb; color: #2563eb; }
                .taphoa-btn:hover { transform: translateY(-2px); }
                .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
                .badge-success { background: #dcfce7; color: #15803d; }
                .badge-danger { background: #fee2e2; color: #b91c1c; }
                .taphoa-input { width: 100%; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 13px; color: #374151; background: #fff; transition: all 0.2s; outline: none; }
                .taphoa-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
                .table-wrap { overflow-x: auto; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                table { width: 100%; border-collapse: collapse; background: #fff; }
                thead tr { background: linear-gradient(135deg, #1a3a6b, #1e4fa0); }
                th { color: #fff; font-size: 12px; font-weight: 600; padding: 12px 16px; text-align: left; }
                tbody tr { border-bottom: 1px solid #f3f4f6; transition: all 0.2s; }
                tbody tr:hover { background: #eff6ff; }
                td { padding: 12px 16px; font-size: 13px; color: #4b5563; }
                @font-face { font-family: 'Tahoma'; font-weight: normal; font-style: normal; }
                .tahoma { font-family: Tahoma, Geneva, Verdana, sans-serif !important; }
            `}</style>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 24, right: 24, zIndex: 9999,
                    background: toast.ok ? '#15803d' : '#dc2626',
                    color: '#fff', padding: '14px 22px', borderRadius: 14,
                    fontWeight: 700, fontSize: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                    animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)'
                }}>{toast.msg}</div>
            )}

            {/* Header: Back + Name + Edit Button */}
            <div className="flex items-center gap-4 mb-6 tahoma">
                <button onClick={onBack} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 10, border: '1px solid #e5e7eb',
                    background: '#fff', color: '#374151', textDecoration: 'none',
                    fontSize: 13, fontWeight: 600, transition: 'all 0.2s'
                }}>← Quay lại Nhân sự</button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e4fa0', margin: 0 }}>
                            👔 {staff.full_name}
                            {staff.nick_name && <span style={{ fontSize: 14, color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>({staff.nick_name})</span>}
                        </h1>
                        {staff.department && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                                color: '#1e4fa0', border: '1px solid #bfdbfe',
                                whiteSpace: 'nowrap'
                            }}>
                                🏢 {staff.department}
                            </span>
                        )}
                        {staff.position && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                                background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                                color: '#6d28d9', border: '1px solid #c4b5fd',
                                whiteSpace: 'nowrap'
                            }}>
                                💼 {staff.position}
                            </span>
                        )}
                        {!staff.department && (
                            <span style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: '#f9fafb', color: '#9ca3af', border: '1px dashed #d1d5db' }}>🏢 Chưa có phòng ban</span>
                        )}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, fontWeight: 600 }}>
                        📞 {staff.phone} {staff.email && <> &nbsp;·&nbsp; ✉️ {staff.email}</>}
                    </div>
                </div>
                {editMode ? (
                    <div className="flex gap-2">
                        <button onClick={() => { setForm(staff); setEditMode(false); }} className="taphoa-btn taphoa-btn-outline">Hủy</button>
                        <button onClick={handleSave} disabled={saving} className="taphoa-btn taphoa-btn-primary">
                            {saving ? '⏳ Đang lưu...' : '💾 Lưu tất cả'}
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setEditMode(true)} className="taphoa-btn taphoa-btn-outline">✏️ Chỉnh sửa</button>
                )}
            </div>

            {/* Profile Card Stats: Blue Gradient Background */}
            <div className="taphoa-card tahoma" style={{
                padding: 20, marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 20,
                background: 'linear-gradient(135deg, #f0f7ff, #e8f4fd)',
                border: '1px solid #bfdbfe'
            }}>
                <div style={{
                    width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #1e4fa0, #2563eb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, color: '#fff', fontWeight: 900, overflow: 'hidden',
                    border: '3px solid #fff', boxShadow: '0 4px 12px rgba(30,79,160,0.2)'
                }}>
                    {staff.avatar ? <img src={staff.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : staff.full_name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, flex: 1 }}>
                    {[
                        { label: 'Lương cơ bản', value: formatCurrency(staff.base_salary), color: '#16a34a' },
                        { label: 'Tổng phụ cấp', value: formatCurrency(totalAllowance), color: '#2563eb' },
                        { label: 'Lương gross', value: formatCurrency(grossSalary), color: '#7c3aed' },
                        { label: 'Ngày vào làm', value: formatDate(staff.join_date), color: '#d97706' },
                        { label: 'Loại HĐ', value: CONTRACT_LABELS[staff.contract_type || ''] || '—', color: '#374151' },
                        { label: 'Phòng ban', value: staff.department || '—', color: '#374151' },
                    ].map(item => (
                        <div key={item.label} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2, fontWeight: 700 }}>{item.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-1 mb-5 border-b-2 border-slate-200 tahoma">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        style={{
                            padding: '10px 16px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                            background: 'none', color: activeTab === t.id ? '#1e4fa0' : '#6b7280',
                            borderBottom: activeTab === t.id ? '3px solid #1e4fa0' : '3px solid transparent',
                            marginBottom: -2, transition: 'all 0.2s'
                        }}
                    >{t.label}</button>
                ))}
            </div>

            {/* Tab: Personal */}
            {activeTab === 'personal' && (
                <div className="taphoa-card card-body tahoma">
                    <Section title="👤 Thông tin cá nhân">
                        <Grid2>
                            <Field label="Họ và tên" editMode={editMode} value={form.full_name || ''} onChange={v => setField('full_name', v)} />
                            <Field label="Biệt danh" editMode={editMode} value={form.nick_name || ''} onChange={v => setField('nick_name', v)} />
                            <Field label="Số điện thoại" editMode={editMode} value={form.phone || ''} onChange={v => setField('phone', v)} />
                            <Field label="Email" editMode={editMode} value={form.email || ''} onChange={v => setField('email', v)} />
                            <Field label="Giới tính" editMode={editMode} value={form.gender || ''} onChange={v => setField('gender', v)} />
                            <Field label="Ngày sinh" editMode={editMode} value={form.dob || ''} onChange={v => setField('dob', v)} />
                        </Grid2>
                        <hr style={{ margin: '24px 0', borderColor: '#f3f4f6' }} />
                        <h3 style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 14 }}>📄 Giấy tờ tùy thân</h3>
                        <Grid2>
                            <Field label="Số CCCD / CMND" editMode={editMode} value={form.id_card || ''} onChange={v => setField('id_card', v)} />
                            <Field label="Ngày cấp" editMode={editMode} value={form.id_card_date || ''} onChange={v => setField('id_card_date', v)} />
                            <Field label="Nơi cấp" editMode={editMode} value={form.id_card_place || ''} onChange={v => setField('id_card_place', v)} />
                            <Field label="Địa chỉ thường trú" editMode={editMode} value={form.address || ''} onChange={v => setField('address', v)} />
                        </Grid2>
                    </Section>
                </div>
            )}

            {/* Tab: Contract */}
            {activeTab === 'contract' && (
                <div className="space-y-5 tahoma">
                    <div className="taphoa-card card-body">
                        <Section title="🏢 Cơ cấu tổ chức">
                            <Grid3>
                                <Field label="Phòng ban" editMode={editMode} value={form.department || ''} onChange={v => setField('department', v)} />
                                <Field label="Chức vụ" editMode={editMode} value={form.position || ''} onChange={v => setField('position', v)} />
                                <Field label="Ngày vào làm" editMode={editMode} value={form.join_date || ''} onChange={v => setField('join_date', v)} />
                            </Grid3>
                        </Section>
                    </div>
                    <div className="taphoa-card card-body">
                        <Section title="📋 Hợp đồng & Bảo hiểm">
                            <Grid2>
                                <Field label="Loại hợp đồng" editMode={editMode} value={form.contract_type || ''} onChange={v => setField('contract_type', v)} />
                                <Field label="Số hợp đồng" editMode={editMode} value={form.contract_no || ''} onChange={v => setField('contract_no', v)} />
                                <Field label="Số sổ BHXH" editMode={editMode} value={form.bhxh_no || ''} onChange={v => setField('bhxh_no', v)} />
                                <Field label="Số thẻ BHYT" editMode={editMode} value={form.bhyt_no || ''} onChange={v => setField('bhyt_no', v)} />
                            </Grid2>
                        </Section>
                    </div>
                </div>
            )}

            {/* Tab: Salary */}
            {activeTab === 'salary' && (
                <div className="taphoa-card card-body tahoma">
                    <Section title="💰 Cơ cấu lương & Phụ cấp">
                        <table style={{ width: '100%', marginBottom: 0 }}>
                            <tbody>
                                <tr style={{ background: '#fffbeb', fontWeight: 800 }}>
                                    <td style={{ paddingLeft: 14 }}>💵 Lương cơ bản</td>
                                    <td style={{ textAlign: 'right', color: '#16a34a', fontSize: 16 }}>
                                        {editMode ? <input type="number" className="taphoa-input" style={{ width: 140 }} value={form.base_salary || 0} onChange={e => setField('base_salary', Number(e.target.value))} /> : formatCurrency(form.base_salary || 0)}
                                    </td>
                                </tr>
                                {SALARY_ITEMS.map(item => (
                                    <tr key={item.key}>
                                        <td style={{ paddingLeft: 28, fontSize: 12 }}>+ {item.label}</td>
                                        <td style={{ textAlign: 'right', color: '#2563eb' }}>
                                            {editMode ? <input type="number" className="taphoa-input" style={{ width: 140 }} value={form.salary_detail?.[item.key] || 0} onChange={e => setSalaryDetail(item.key, Number(e.target.value))} /> : formatCurrency(form.salary_detail?.[item.key] || 0)}
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{ background: '#f5f3ff', fontWeight: 900, borderTop: '2px solid #c4b5fd' }}>
                                    <td style={{ paddingLeft: 14, fontSize: 15 }}>🏆 Tổng lương GROSS</td>
                                    <td style={{ textAlign: 'right', color: '#7c3aed', fontSize: 18 }}>{formatCurrency(grossSalary)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Section>
                </div>
            )}

            {/* Tab: History */}
            {activeTab === 'history' && (
                <div className="table-wrap tahoma">
                    <table>
                        <thead>
                            <tr><th>Ngày</th><th>Loại</th><th>Số tiền</th><th>Nội dung</th></tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Chưa có giao dịch nào</td></tr>
                            ) : (
                                transactions.map(t => (
                                    <tr key={t.id}>
                                        <td>{formatDate(t.trans_date)}</td>
                                        <td><span className={`badge ${t.trans_type==='bonus'?'badge-success':'badge-danger'}`}>{t.trans_type}</span></td>
                                        <td style={{ fontWeight: 800, color: t.amount > 0 ? '#16a34a' : '#b91c1c' }}>{formatCurrency(t.amount)}</td>
                                        <td>{t.description}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Tab: Attendance */}
            {activeTab === 'attendance' && (
                <div className="table-wrap tahoma">
                    <table>
                        <thead>
                            <tr><th>Ngày</th><th>Check-in</th><th>Check-out</th><th>Trạng thái</th><th>Phạt</th></tr>
                        </thead>
                        <tbody>
                            {attendance.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Không có dữ liệu chấm công</td></tr>
                            ) : (
                                attendance.map(a => (
                                    <tr key={a.id}>
                                        <td style={{ fontWeight: 700 }}>{formatDate(a.work_date)}</td>
                                        <td>{formatTime(a.check_in)}</td>
                                        <td>{formatTime(a.check_out)}</td>
                                        <td><span className={`badge ${a.is_late?'badge-danger':'badge-success'}`}>{a.is_late?'Muộn':'Đúng giờ'}</span></td>
                                        <td style={{ color: '#b91c1c' }}>{a.late_fine ? formatCurrency(a.late_fine) : '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

/* ─── Helper UI Components (Matching TaphoaSG) ────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h2 style={{ fontSize: 15, fontWeight: 900, color: '#1e4fa0', marginBottom: 18, borderBottom: '2px solid #eff6ff', paddingBottom: 10 }}>{title}</h2>
            {children}
        </div>
    );
}
function Grid2({ children }: { children: React.ReactNode }) {
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>{children}</div>;
}
function Grid3({ children }: { children: React.ReactNode }) {
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>{children}</div>;
}
function Field({ label, value, editMode, onChange }: { label: string; value: string; editMode: boolean; onChange?: (v: string) => void }) {
    return (
        <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontWeight: 800, marginBottom: 4 }}>{label.toUpperCase()}</label>
            {editMode ? (
                <input className="taphoa-input" value={value} onChange={e => onChange?.(e.target.value)} />
            ) : (
                <div style={{ fontSize: 14, fontWeight: 800, color: value ? '#374151' : '#d1d5db', borderBottom: '1px dashed #f3f4f6', minHeight: '21px' }}>{value || '—'}</div>
            )}
        </div>
    );
}

export default StaffProfile;
