import React, { useEffect, useState } from 'react';
import { SecureAPI } from '../lib/secureApi';

interface CurrencyTotal {
    currency: string;
    amount: string;
}

interface RevenueData {
    property_id: string;
    tenant_id: string;
    totals: CurrencyTotal[];
    count: number;
    month: number | null;
    year: number | null;
}

interface RevenueSummaryProps {
    propertyId?: string;
    showRaw?: boolean;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export const RevenueSummary: React.FC<RevenueSummaryProps> = ({ propertyId = 'prop-001', showRaw }) => {
    const [data, setData] = useState<RevenueData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [month, setMonth] = useState<number | ''>(3);
    const [year, setYear] = useState<number | ''>(2024);

    useEffect(() => {
        const fetchRevenue = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await SecureAPI.getDashboardSummary(propertyId, {
                    month: month === '' ? undefined : Number(month),
                    year: year === '' ? undefined : Number(year),
                });
                setData(response);
            } catch (err) {
                setError('Failed to load revenue data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchRevenue();
    }, [propertyId, month, year]);

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                    <div className="h-8 bg-gray-100 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (error) return <div className="p-4 text-red-500 bg-red-50 rounded-lg">{error}</div>;
    if (!data) return null;

    const periodLabel = data.month && data.year ? `${MONTHS[data.month - 1]} ${data.year}` : 'All time';

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {showRaw && (
                <div className="p-3 bg-gray-50 text-xs font-mono border-b border-gray-100 overflow-auto max-h-48">
                    <strong className="block mb-1 text-gray-500 uppercase tracking-wider text-[10px]">Raw API Response</strong>
                    <pre className="text-gray-700">{JSON.stringify(data, null, 2)}</pre>
                </div>
            )}

            <div className="p-6">
                <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                    <div>
                        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Revenue</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <select
                            value={month}
                            onChange={(e) => setMonth(e.target.value === '' ? '' : Number(e.target.value))}
                            className="text-sm border border-gray-200 rounded px-2 py-1"
                        >
                            <option value="">All months</option>
                            {MONTHS.map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Year"
                            className="text-sm border border-gray-200 rounded px-2 py-1 w-24"
                            min={2000}
                            max={2100}
                        />
                    </div>
                </div>

                {data.totals.length === 0 ? (
                    <div className="text-2xl font-semibold text-gray-400">No reservations</div>
                ) : (
                    <div className="space-y-1">
                        {data.totals.map((t) => (
                            <div key={t.currency} className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-gray-900 tracking-tight font-mono">
                                    {t.amount}
                                </span>
                                <span className="text-sm font-medium text-gray-500">{t.currency}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 mt-4 border-t border-gray-100">
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Property ID</p>
                        <p className="text-sm font-semibold text-gray-700 font-mono mt-1">{data.property_id}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Reservations</p>
                        <p className="text-sm font-semibold text-gray-700 mt-1">
                            {data.count} <span className="font-normal text-gray-400">bookings</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
