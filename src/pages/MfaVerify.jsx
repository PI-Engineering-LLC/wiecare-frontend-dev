import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';

import { User, Building2, Bell, Shield, Camera, Save, Lock, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

export default function MfaVerify() {
    const [params] = useSearchParams();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [backupCodes, setBackupCodes] = useState(null); 
    const [showBackupCodes, setShowBackupCodes] = useState(false); 
    const { login } = useAuth(); 

    const handleVerify = async (e) => {
        e.preventDefault();
        setError(''); 
        try {
            const res = await api.verifyMfa( {
                code,
            });
            if (res.backup_codes && res.backup_codes.length > 0) {
                setBackupCodes(res.backup_codes);
                setShowBackupCodes(true);
            } else {
                // If no backup codes (e.g., MFA was already enabled), directly navigate
                window.location.href = '/'; 
            }
        } catch {
            setError( 'Invalid code. Try a backup code if you lost your device.');
            toast.error('Invalid code. Try a backup code if you lost your device.');
        }
    };
    const handleContinueToDashboard = () => {
        window.location.href = '/'; // Navigate after user acknowledges backup codes
    };

    return (
        <div className="max-w-sm mx-auto mt-32 p-8 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
           {showBackupCodes ? (
                <>
                    <div className="w-12 h-12 bg-[#005f27]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-6 w-6 text-[#005f27]" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-1">MFA Enabled!</h1>
                    <p className="text-sm text-slate-500 mb-6">
                        Please save these backup codes in a safe place. They are your only way to
                        access your account if you lose your authenticator device.
                    </p>
                    <div className="bg-slate-100 p-4 rounded-lg text-left mb-6">
                        <h2 className="text-sm font-semibold text-slate-700 mb-2">Your Backup Codes:</h2>
                        <ul className="grid grid-cols-2 gap-2 text-sm font-mono text-slate-800">
                            {backupCodes.map((bc, index) => (
                                <li key={index}>{bc}</li>
                            ))}
                        </ul>
                    </div>
                    <Button onClick={handleContinueToDashboard} className="w-full bg-[#005f27] hover:bg-[#436a36] text-white h-10">
                        Continue to Dashboard
                    </Button>
                </>
            ) : (
                <> <div className="w-12 h-12 bg-[#005f27]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-6 w-6 text-[#005f27]" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Check your authenticator</h1>
            <p className="text-sm text-slate-500 mb-6">Enter the 6-digit code from your app</p>
            <form onSubmit={handleVerify} className="space-y-4">
                <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="000 000 or or A3F9B2C1"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    maxLength={8}
                    className="text-center text-2xl tracking-widest font-mono h-14"
                    autoFocus
                />
                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-100">
                        <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                        <p className="text-sm text-rose-700">{error}</p>
                    </div>
                )}
                <Button type="submit" className="w-full bg-[#005f27] hover:bg-[#436a36] text-white h-10">
                    Verify
                </Button>
            </form>
            </> )}
        </div>
    );
}