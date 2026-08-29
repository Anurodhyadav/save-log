import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ResponsiveContainer,
    ComposedChart,
    BarChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { RenderAmount } from '../components/RenderAmount';

const COLORS = {
    text: '#262220',
    muted: '#7A6E5D',
    deposit: '#3F6B4C',
    withdrawal: '#A8322D',
    balance: '#B08D3E',
    grid: '#DDD0BA',
    card: '#FFFDF8',
};

const fmt = (n) => {
    n = Math.round(n || 0);
    return 'Rs ' + n.toLocaleString('en-IN');
};

const fmtShort = (n) => {
    n = Math.round(n || 0);
    const abs = Math.abs(n);
    if (abs >= 100000) return (n / 100000).toFixed(abs % 100000 === 0 ? 0 : 1) + 'L';
    if (abs >= 1000) return (n / 1000).toFixed(abs % 1000 === 0 ? 0 : 1) + 'k';
    return n.toString();
};

const monthKey = (dateStr) => dateStr.slice(0, 7);
const monthLabel = (key) => {
    const d = new Date(key + '-01T00:00:00');
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
};
const weekOfMonth = (dateStr) => Math.floor((parseInt(dateStr.slice(8, 10), 10) - 1) / 7) + 1;

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div
            style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.grid}`,
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                boxShadow: '0 2px 8px rgba(38,34,32,0.08)',
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: 4, color: COLORS.text }}>{label}</div>
            {payload.map((p) => (
                <div key={p.dataKey} style={{ color: p.color }}>
                    {p.name}: {fmt(p.name === 'Withdrawals' ? -Math.abs(p.value) : p.value)}
                </div>
            ))}
        </div>
    );
};

export const StatementChart = () => {
    const { entries } = useAppContext();
    const [view, setView] = useState('monthly'); // 'monthly' | 'weekly'
    const [selectedMonth, setSelectedMonth] = useState(null);

    const monthlyData = useMemo(() => {
        const map = {};
        entries.forEach((e) => {
            const k = monthKey(e.date);
            if (!map[k]) map[k] = { key: k, deposits: 0, withdrawals: 0 };
            if (e.amount >= 0) map[k].deposits += e.amount;
            else map[k].withdrawals += Math.abs(e.amount);
        });
        const sorted = Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
        let running = 0;
        return sorted.map((m) => {
            running += m.deposits - m.withdrawals;
            return { ...m, label: monthLabel(m.key), balance: running };
        });
    }, [entries]);

    const months = monthlyData.map((m) => m.key);
    const activeMonth = selectedMonth || months[months.length - 1];

    const weeklyData = useMemo(() => {
        if (!activeMonth) return [];
        const map = {};
        entries
            .filter((e) => monthKey(e.date) === activeMonth)
            .forEach((e) => {
                const w = weekOfMonth(e.date);
                const k = `Week ${w}`;
                if (!map[k]) map[k] = { key: k, deposits: 0, withdrawals: 0, order: w };
                if (e.amount >= 0) map[k].deposits += e.amount;
                else map[k].withdrawals += Math.abs(e.amount);
            });
        return Object.values(map).sort((a, b) => a.order - b.order);
    }, [entries, activeMonth]);

    const totals = useMemo(() => {
        const source = view === 'monthly' ? entries : entries.filter((e) => monthKey(e.date) === activeMonth);
        const deposits = source.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
        const withdrawals = source.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
        return { deposits, withdrawals, net: deposits - withdrawals };
    }, [entries, view, activeMonth]);

    const chartData = view === 'monthly' ? monthlyData : weeklyData;
    const xKey = view === 'monthly' ? 'label' : 'key';
    const Chart = view === 'monthly' ? ComposedChart : BarChart;

    return (
        <div className="mt-4">
            <div className="flex justify-between items-end mb-6">
                <div className="flex items-center gap-3">
                    <Link to="/statement" className="text-[#7A6E5D] hover:text-[#262220] transition-colors" aria-label="Back to home">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </Link>
                    <h2 className="text-xl font-semibold mb-0">Chart</h2>
                </div>
                <Link to="/statement" className="text-sm text-[#7A6E5D] hover:text-[#262220] underline">
                    View statement
                </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-5">
                <button
                    onClick={() => setView('monthly')}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${view === 'monthly' ? 'bg-[#262220] text-[#F2E8D9] border-[#262220]' : 'text-[#7A6E5D] border-[#DDD0BA]'
                        }`}
                >
                    Monthly
                </button>
                <button
                    onClick={() => setView('weekly')}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${view === 'weekly' ? 'bg-[#262220] text-[#F2E8D9] border-[#262220]' : 'text-[#7A6E5D] border-[#DDD0BA]'
                        }`}
                >
                    Weekly
                </button>

                {view === 'weekly' && months.length > 0 && (
                    <select
                        value={activeMonth || ''}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="ml-auto px-3 py-1.5 text-sm rounded-full border border-[#DDD0BA] bg-transparent text-[#262220]"
                    >
                        {months.map((m) => (
                            <option key={m} value={m}>
                                {monthLabel(m)}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="border border-[#DDD0BA] rounded-lg p-3">
                    <div className="text-xs text-[#7A6E5D] uppercase tracking-wide mb-1">Deposits</div>
                    <div className="text-xs  md:text-lg font-semibold text-[#3F6B4C] font-mono">
                        <RenderAmount amount={totals.deposits} />
                    </div>
                </div>
                <div className="border border-[#DDD0BA] rounded-lg p-3">
                    <div className="text-xs text-[#7A6E5D] uppercase tracking-wide mb-1">Withdrawals</div>
                    <div className="text-xs  md:text-lg font-semibold text-[#A8322D] font-mono">
                        <RenderAmount amount={totals.withdrawals} />
                    </div>
                </div>
                <div className="border border-[#DDD0BA] rounded-lg p-3">
                    <div className="text-xs text-[#7A6E5D] uppercase tracking-wide mb-1">Net</div>
                    <div className="text-xs md:text-lg font-semibold text-[#262220] font-mono">
                        <RenderAmount amount={totals.net} />
                    </div>
                </div>
            </div>

            {chartData.length === 0 ? (
                <div className="text-sm text-[#7A6E5D] py-3.5">No data to chart.</div>
            ) : (
                <div style={{ width: '100%', height: 340 }}>
                    <ResponsiveContainer>
                        <Chart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                            <XAxis dataKey={xKey} tick={{ fill: COLORS.muted, fontSize: 12 }} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
                            <YAxis
                                yAxisId="left"
                                tick={{ fill: COLORS.muted, fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={fmtShort}
                            />
                            {view === 'monthly' && (
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    tick={{ fill: COLORS.balance, fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={fmtShort}
                                />
                            )}
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(38,34,32,0.04)' }} />
                            <Legend wrapperStyle={{ fontSize: 12, color: COLORS.muted }} />
                            <Bar yAxisId="left" dataKey="deposits" name="Deposits" fill={COLORS.deposit} radius={[3, 3, 0, 0]} barSize={view === 'monthly' ? 14 : 28} />
                            <Bar yAxisId="left" dataKey="withdrawals" name="Withdrawals" fill={COLORS.withdrawal} radius={[3, 3, 0, 0]} barSize={view === 'monthly' ? 14 : 28} />
                            {view === 'monthly' && (
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="balance"
                                    name="Balance"
                                    stroke={COLORS.balance}
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: COLORS.balance }}
                                />
                            )}
                        </Chart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};