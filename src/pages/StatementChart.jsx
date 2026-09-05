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
    PieChart,
    Pie,
    Cell,
    Sector,
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

const TIER_COLORS = {
    Mini: '#B08D3E',
    Small: '#3F6B4C',
    Standard: '#2C5282',
    Large: '#A8322D',
};

const DEPOSITOR_COLORS = {
    'Anurodh': '#2B4570', // Slate Blue
    'Pramodh': '#7C3AED', // Violet / Purple
    'Parent': '#D97706',  // Amber / Gold
};

const classifyDeposit = (amount) => {
    if (amount >= 100000) return 'Large';
    if (amount >= 10000) return 'Standard';
    if (amount >= 1000) return 'Small';
    return 'Mini';
};

/* Active slice renderer for the pie chart */
const renderActiveShape = (props) => {
    const {
        cx, cy, innerRadius, outerRadius, startAngle, endAngle,
        fill, payload, percent, value,
    } = props;
    const absVal = Math.abs(Math.round(value || 0));
    // Always show exact full amount in the hover center
    const display = 'Rs\u2009' + absVal.toLocaleString('en-IN');
    return (
        <g>
            <text x={cx} y={cy - 14} textAnchor="middle" fill={fill} style={{ fontSize: 15, fontWeight: 700 }}>
                {payload.name}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fill={COLORS.text} style={{ fontSize: 13, fontWeight: 600 }}>
                {display}
            </text>
            <text x={cx} y={cy + 26} textAnchor="middle" fill={COLORS.muted} style={{ fontSize: 12 }}>
                {(percent * 100).toFixed(1)}% of deposits
            </text>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
                startAngle={startAngle} endAngle={endAngle} fill={fill} />
            <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 15}
                startAngle={startAngle} endAngle={endAngle} fill={fill} />
        </g>
    );
};

/* Active slice renderer for the depositor contribution pie chart */
const renderActiveDepositorShape = (props) => {
    const {
        cx, cy, innerRadius, outerRadius, startAngle, endAngle,
        fill, payload, percent, value,
    } = props;
    const absVal = Math.abs(Math.round(value || 0));
    // Always show exact full amount in the hover center
    const display = 'Rs\u2009' + absVal.toLocaleString('en-IN');
    return (
        <g>
            <text x={cx} y={cy - 14} textAnchor="middle" fill={fill} style={{ fontSize: 15, fontWeight: 700 }}>
                {payload.name}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fill={COLORS.text} style={{ fontSize: 13, fontWeight: 600 }}>
                {display}
            </text>
            <text x={cx} y={cy + 26} textAnchor="middle" fill={COLORS.muted} style={{ fontSize: 12 }}>
                {(percent * 100).toFixed(1)}% of net balance
            </text>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
                startAngle={startAngle} endAngle={endAngle} fill={fill} />
            <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 15}
                startAngle={startAngle} endAngle={endAngle} fill={fill} />
        </g>
    );
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
    const [view, setView] = useState('monthly'); // 'monthly' | 'weekly' | 'pie'
    const [activePieIndex, setActivePieIndex] = useState(0);
    const [activeDepositorIndex, setActiveDepositorIndex] = useState(0);
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
        const source = view === 'weekly' ? entries.filter((e) => monthKey(e.date) === activeMonth) : entries;
        const deposits = source.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
        const withdrawals = source.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
        return { deposits, withdrawals, net: deposits - withdrawals };
    }, [entries, view, activeMonth]);


    const pieData = useMemo(() => {
        const tiers = { Mini: 0, Small: 0, Standard: 0, Large: 0 };
        entries
            .forEach((e) => { tiers[classifyDeposit(Math.abs(e.amount))] += e.amount; });
        return Object.entries(tiers)
            .filter(([, sum]) => sum > 0)
            .map(([name, value]) => ({ name, value }));
    }, [entries]);

    const depositorPieData = useMemo(() => {
        const netMap = { 'Anurodh': 0, 'Pramodh': 0, 'Parent': 0 };
        entries.forEach((e) => {
            let dep = e.depositedBy || 'Anurodh';
            if (!netMap[dep]) netMap[dep] = 0;
            netMap[dep] += e.amount; // accumulates deposits (+) and withdrawals (-)
        });
        return Object.entries(netMap)
            .filter(([, net]) => net > 0) // only show depositors with positive net
            .map(([name, value]) => ({ name, value }));
    }, [entries]);



    const chartData = view === 'monthly' ? monthlyData : weeklyData;
    const xKey = view === 'monthly' ? 'label' : 'key';
    const Chart = view === 'monthly' ? ComposedChart : BarChart;

    return (
        <div className="mt-4">
            <div className="flex justify-between items-end mb-6">
                <div className="flex items-center gap-3">
                    <Link to="/statement" className="text-[#7A6E5D] hover:text-[#262220] transition-colors" aria-label="Back to statement">
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
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${view === 'monthly' ? 'bg-[#262220] text-[#F2E8D9] border-[#262220]' : 'text-[#7A6E5D] border-[#DDD0BA]'}`}
                >
                    Monthly
                </button>
                <button
                    onClick={() => setView('weekly')}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${view === 'weekly' ? 'bg-[#262220] text-[#F2E8D9] border-[#262220]' : 'text-[#7A6E5D] border-[#DDD0BA]'}`}
                >
                    Weekly
                </button>
                <button
                    onClick={() => setView('pie')}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${view === 'pie' ? 'bg-[#262220] text-[#F2E8D9] border-[#262220]' : 'text-[#7A6E5D] border-[#DDD0BA]'}`}
                >
                    Pie Chart
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

            {view === 'pie' ? (
                <div className="flex flex-col gap-8">
                    {/* Contributor Distribution Pie Chart */}
                    <div className="border border-[#DDD0BA] rounded-xl p-4 bg-[#FDF1E3] shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#262220]">
                                Contribution by Depositor
                            </h3>
                            <span className="text-xs text-[#7A6E5D]">
                                {depositorPieData.length} {depositorPieData.length === 1 ? 'depositor' : 'depositors'}
                            </span>
                        </div>

                        {depositorPieData.length === 0 ? (
                            <div className="text-sm text-[#7A6E5D] py-3.5">No contribution data to display.</div>
                        ) : (
                            <div>
                                <div style={{ width: '100%', height: 320 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                activeIndex={activeDepositorIndex}
                                                activeShape={renderActiveDepositorShape}
                                                data={depositorPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={72}
                                                outerRadius={110}
                                                dataKey="value"
                                                onMouseEnter={(_, index) => setActiveDepositorIndex(index)}
                                            >
                                                {depositorPieData.map((entry) => (
                                                    <Cell key={entry.name} fill={DEPOSITOR_COLORS[entry.name] || '#3F6B4C'} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                                    {depositorPieData.map((d) => {
                                        const totalNet = depositorPieData.reduce((s, item) => s + item.value, 0);
                                        const pct = totalNet > 0 ? ((d.value / totalNet) * 100).toFixed(1) : '0.0';
                                        const absVal = Math.round(d.value);
                                        // Show 2dp for L, 1dp for k in the legend cards
                                        const display = absVal >= 100000
                                            ? 'Rs\u2009' + (absVal / 100000).toFixed(2).replace(/\.?0+$/, '') + 'L'
                                            : absVal >= 1000
                                                ? 'Rs\u2009' + (absVal / 1000).toFixed(1).replace(/\.?0+$/, '') + 'k'
                                                : 'Rs\u2009' + absVal.toLocaleString('en-IN');
                                        const color = DEPOSITOR_COLORS[d.name] || '#3F6B4C';

                                        return (
                                            <div
                                                key={d.name}
                                                className="flex items-start gap-2.5 border border-[#DDD0BA] rounded-lg p-3 cursor-pointer bg-[#FDF1E3]"
                                                onMouseEnter={() => {
                                                    const idx = depositorPieData.findIndex((item) => item.name === d.name);
                                                    if (idx !== -1) setActiveDepositorIndex(idx);
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: 12, height: 12, borderRadius: 3,
                                                        background: color,
                                                        flexShrink: 0, marginTop: 2,
                                                    }}
                                                />
                                                <div>
                                                    <div className="text-xs font-semibold text-[#262220]">{d.name}</div>
                                                    <div className="text-[10px] text-[#7A6E5D]">Net balance</div>
                                                    <div className="text-xs font-mono mt-0.5" style={{ color }}>
                                                        {display} &middot; {pct}%
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Deposit Size Tiers Pie Chart */}
                    <div className="border border-[#DDD0BA] rounded-xl p-4 bg-[#FDF1E3] shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#262220]">
                                Deposits by Tier
                            </h3>
                            <span className="text-xs text-[#7A6E5D]">
                                Size Distribution
                            </span>
                        </div>

                        {pieData.length === 0 ? (
                            <div className="text-sm text-[#7A6E5D] py-3.5">No deposit data to display.</div>
                        ) : (
                            <div>
                                <div style={{ width: '100%', height: 320 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                activeIndex={activePieIndex}
                                                activeShape={renderActiveShape}
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={72}
                                                outerRadius={110}
                                                dataKey="value"
                                                onMouseEnter={(_, index) => setActivePieIndex(index)}
                                            >
                                                {pieData.map((entry) => (
                                                    <Cell key={entry.name} fill={TIER_COLORS[entry.name]} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    {[
                                        { name: 'Mini', label: 'Mini', range: '< Rs 1,000' },
                                        { name: 'Small', label: 'Small', range: 'Rs 1K – 9,999' },
                                        { name: 'Standard', label: 'Standard', range: 'Rs 10K – 99,999' },
                                        { name: 'Large', label: 'Large', range: '≥ Rs 1,00,000' },
                                    ].map(({ name, label, range }) => {
                                        const tier = pieData.find((d) => d.name === name);
                                        const tierSum = tier ? tier.value : 0;
                                        const totalSum = pieData.reduce((s, d) => s + d.value, 0);
                                        const pct = totalSum > 0 ? ((tierSum / totalSum) * 100).toFixed(1) : '0.0';
                                        const absVal = Math.round(tierSum);
                                        // 2dp for L, 1dp for k, strip trailing zeros
                                        const display = absVal >= 100000
                                            ? 'Rs\u2009' + (absVal / 100000).toFixed(2).replace(/\.?0+$/, '') + 'L'
                                            : absVal >= 1000
                                                ? 'Rs\u2009' + (absVal / 1000).toFixed(1).replace(/\.?0+$/, '') + 'k'
                                                : 'Rs\u2009' + absVal.toLocaleString('en-IN');
                                        return (
                                            <div
                                                key={name}
                                                className="flex items-start gap-2.5 border border-[#DDD0BA] rounded-lg p-3 cursor-pointer bg-[#FDF1E3]"
                                                style={{ opacity: tierSum === 0 ? 0.4 : 1 }}
                                                onMouseEnter={() => {
                                                    const idx = pieData.findIndex((d) => d.name === name);
                                                    if (idx !== -1) setActivePieIndex(idx);
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: 12, height: 12, borderRadius: 3,
                                                        background: TIER_COLORS[name],
                                                        flexShrink: 0, marginTop: 2,
                                                    }}
                                                />
                                                <div>
                                                    <div className="text-xs font-semibold text-[#262220]">{label}</div>
                                                    <div className="text-[10px] text-[#7A6E5D]">{range}</div>
                                                    <div className="text-xs font-mono mt-0.5" style={{ color: TIER_COLORS[name] }}>
                                                        {tierSum > 0 ? <>{display} &middot; {pct}%</> : '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : chartData.length === 0 ? (
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