import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  TrendingUp, 
  Calendar,
  Download,
  ShoppingCart,
  Users
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const AdminReportsPage = () => {
  const { salesTrend, formatPeso } = useOutletContext();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Analytics & Reports</h2>
          <p className="text-sm text-slate-500">Comprehensive view of your marketplace performance</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 rounded-xl border-slate-200 text-xs font-bold">
            <Calendar className="h-4 w-4" />
            Last 30 Days
          </Button>
          <Button className="gap-2 rounded-xl bg-[#2954C8] text-xs font-bold">
            <Download className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="border-none bg-white/70 shadow-lg backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-blue-50 p-2.5">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <Badge className="bg-emerald-50 text-emerald-600 text-[10px] font-bold">+12.5%</Badge>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#7488A3]">Conversion Rate</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">3.8%</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-white/70 shadow-lg backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-amber-50 p-2.5">
                <ShoppingCart className="h-5 w-5 text-amber-600" />
              </div>
              <Badge className="bg-emerald-50 text-emerald-600 text-[10px] font-bold">+8.2%</Badge>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#7488A3]">Total Sales</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{formatPeso(164240)}</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-white/70 shadow-lg backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-emerald-50 p-2.5">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <Badge className="bg-rose-50 text-rose-600 text-[10px] font-bold">-2.1%</Badge>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#7488A3]">Active Users</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">1,280</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="sales" fill="#2954C8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white/70 shadow-xl backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Customer Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminReportsPage;
