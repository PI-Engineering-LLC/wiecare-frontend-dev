import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { loginSchema } from "@/lib/validators/auth";
import { api } from '@/api/apiClient';
import { Eye, EyeOff } from 'lucide-react';

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AuthProvider, useAuth } from '@/lib/AuthContext';

export default function Login() {
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    try {
      const { mfa_required } = await api.login(data);
      if(mfa_required ){
        // Go to MFA page
        window.location.href = `/mfa-verify`;
        return;
      }
      window.location.href = '/';
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

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
          <CardTitle className="text-2xl font-bold text-slate-900">Welcome to Wiegand USA Customer Portal</CardTitle>
          <CardDescription className="text-slate-500">Sign in to continue</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Button variant="outline" className="w-full flex items-center gap-2 h-11" onClick={handleGoogleLogin}>
            <GoogleIcon />
            <span>Continue with Google</span>
          </Button>

          <div className="relative flex items-center">
            <Separator className="flex-1" />
            <span className="px-3 text-xs uppercase text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-white"
              style={{ backgroundColor: '#005f27' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-between items-center text-sm pb-6">
          <Link to="/forgotPassword" className="text-[#005f27] hover:underline">
            Forgot password?
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}