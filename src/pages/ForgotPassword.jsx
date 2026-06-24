import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { api } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from 'sonner';
import { ArrowLeft, MailCheck } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    setLoading(true);
    try {
      await api.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4" style={{ backgroundColor: '#f4f5f0' }}>
      <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0 text-center p-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#edf0be' }}>
            <MailCheck className="h-8 w-8" style={{ color: '#005f27' }} />
          </div>
        </div>
        <p className="text-xl font-bold text-slate-900">Check your email</p>
        <p className="text-slate-500 mt-2 text-sm">
          If <span className="font-medium text-slate-700">{email}</span> is registered, you'll receive a reset link shortly.
        </p>
        <Link to="/login">
          <Button className="mt-6 w-full h-11 font-semibold text-white" style={{ backgroundColor: '#005f27' }}>
            Back to Login
          </Button>
        </Link>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4" style={{ backgroundColor: '#f4f5f0' }}>
      <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0">
        <div className="w-full h-40 flex items-center justify-center">
          <span className="flex shrink-0 overflow-hidden rounded-full h-20 w-20 sm:h-24 sm:w-24 shadow-lg ring-4 ring-white/50">
            <img
              className="aspect-square h-full w-full object-cover"
              alt="Wiegand USA Customer Portal logo"
              src="/wiecare_logo.png"
            />
          </span>
        </div>

        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-slate-900">Forgot Password</CardTitle>
          <CardDescription className="text-slate-500">
            Enter your email and we'll send you a reset link
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-white"
              style={{ backgroundColor: '#005f27' }}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-[#005f27] transition-colors mt-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}