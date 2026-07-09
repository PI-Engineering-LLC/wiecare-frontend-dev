import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { User, Building2, Bell, Shield, Camera, Save, Lock, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useClient } from '@/lib/ClientContext';
import { AvatarImg } from '@/components/UserAvatar';
import { useUpload } from '@/hooks/useUpload';

const NOTIF_PREFS = [
  { key: 'notif_invoice', label: 'Invoice Reminders', desc: 'Get notified about upcoming and overdue invoices' },
  { key: 'notif_maintenance', label: 'Maintenance Updates', desc: 'Receive updates about maintenance schedules' },
  { key: 'notif_training', label: 'Training Reminders', desc: 'Get reminded about upcoming training sessions' },
  { key: 'notif_order', label: 'Order Status', desc: 'Receive updates when your orders ship' },
  { key: 'notif_email', label: 'Email Notifications', desc: 'Receive notifications via email' },
];

export default function Settings() {
  const { user, updateMe, api, refreshUser } = useAuth();

  useEffect(() => {
    if (user?.mfa_enabled) {
      setMfaStep('done');
    }
  }, [user]);

  // Initialize profile state based on user data
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    job_title: user?.job_title || '',
    avatar_storage_key: user?.avatar_storage_key || '',
  });

  // Initialize preferences state based on user data
  const [prefs, setPrefs] = useState({
    notif_invoice: user?.preferences?.notif_invoice ?? true,
    notif_maintenance: user?.preferences?.notif_maintenance ?? true,
    notif_training: user?.preferences?.notif_training ?? true,
    notif_order: user?.preferences?.notif_order ?? true,
    notif_email: user?.preferences?.notif_email ?? true,
  });

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [uploading, setUploading] = useState(false);

  const [qrCode, setQrCode] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaStep, setMfaStep] = useState('idle'); // idle | scanning | done | disabling
  const [mfaCodeError, setMfaCodeError] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const { activeClientId } = useClient();
  const { uploadFileToS3 } = useUpload();

  const startSetup = async () => {
    try {
      const res = await api.setupMfa();
      setQrCode(res.qrCode);
      setMfaStep('scanning');
    } catch (err) {
      console.error("Failed to setup MFA:", err);
      toast.error('Failed to start MFA setup.');
    }
  };

  const verifyCode = async () => {
    try {
      const res = await api.verifyMfa({
        code: mfaCode,
      });
      if (res.backup_codes && res.backup_codes.length > 0) {
        setBackupCodes(res.backup_codes);
        setShowBackupCodes(true);
      } else {
        refreshUser();
        setMfaStep('done');
        toast.success('2FA enabled successfully!');
      }
    } catch (err) {
      setMfaCodeError('Invalid code. Try again.');
      console.error("MFA verification failed:", err);
    }
  };

  const disableMfa = async () => {
    setMfaStep('disabling');
    setDisableCode('');
  };

  const confirmDisableMfa = async () => {
    setMfaCodeError('');
    try {
      await api.disableMfa({
        code: disableCode,
      });
      refreshUser();
      setMfaStep('idle');
      setDisableCode('');
      toast.info('2FA has been disabled.');
    } catch (err) {
      setMfaCodeError('Invalid code. Try again.');
      console.error("MFA disable failed:", err);
    }
  };
  const handleDone = () => {
    refreshUser();
    setMfaStep('done');
    toast.success('2FA enabled successfully!');
  }

  const updateProfileMutation = useMutation({
    mutationFn: (data) => updateMe(data),
    onSuccess: () => {
      toast.success('Profile updated');
      refreshUser();
    },
    onError: (err) => {
      console.error("Profile update failed:", err);
      toast.error(`Failed to update profile: ${err.message}`);
    },
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const file_key = await uploadFileToS3({ client_id: activeClientId, file, type: 'avatar', isPrivate: false })

      const newStorageKey = file_key;
      setProfile(prev => ({ ...prev, avatar_storage_key: newStorageKey }));
      await updateMe({ avatar_storage_key: newStorageKey });
      refreshUser();
      toast.success('Photo updated');
    } catch (err) {
      console.error("Avatar upload failed:", err);
      toast.error('Failed to upload photo');
      setUploading(false);
    }
    setUploading(false);
  };

  const handleTogglePref = async (key, value) => {
    // Optimistic update
    setPrefs(prev => ({ ...prev, [key]: value }));
    try {
      await updateMe({ [key]: value });
      toast.success('Preference saved');
      refreshUser();
    } catch (err) {
      // Revert on error
      setPrefs(prev => ({ ...prev, [key]: !value }));
      console.error("Preference save failed:", err);
      toast.error('Failed to save preference');
    }
  };

  const handleChangePassword = async () => {
    if (passwords.next !== passwords.confirm) return toast.error('Passwords do not match');
    if (passwords.next.length < 8) return toast.error('Password must be at least 8 characters');
    try {
      await api.changePassword({ current_password: passwords.current, new_password: passwords.next });
      toast.success('Password changed successfully');
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (err) {
      console.error("Change password failed:", err);
      toast.error(err.message);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get active client's role for display
  const activeClientMembership = user?.memberships?.find(m => m.clientId === activeClientId);
  const activeClientRole = activeClientMembership?.roles[0]?.name; // Assuming one primary role for display

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="text-slate-500 text-sm mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />Security
          </TabsTrigger>
        </TabsList>

        {/* ── PROFILE ── */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
              <CardDescription>Update your profile picture</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <AvatarImg avatarKey={profile.avatar_storage_key} fallback={getInitials(profile.full_name)} />

                <div>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload}
                    className="hidden" id="avatar-upload" disabled={uploading} />
                  <label htmlFor="avatar-upload">
                    <Button variant="outline" disabled={uploading} asChild>
                      <span className="cursor-pointer">
                        <Camera className="h-4 w-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Change Photo'}
                      </span>
                    </Button>
                  </label>
                  <p className="text-sm text-slate-500 mt-2">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled className="mt-1 bg-slate-50" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="mt-1" placeholder="+1 (555) 123-4567" />
                </div>
                <div>
                  <Label>Job Title</Label>
                  <Input value={profile.job_title}
                    onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                    className="mt-1" placeholder="Operations Manager" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={() => updateProfileMutation.mutate(profile)}
                  disabled={updateProfileMutation.isPending}
                  className="bg-[#1e3a5f] hover:bg-[#2d5a8a]">
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {activeClientId && ( // Only show if an active client is selected
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />Company Information
                </CardTitle>
                <CardDescription>Your organization details (managed by admin)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Contact your administrator to update company information.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── NOTIFICATIONS ── */}
        <TabsContent value="notifications" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Changes are saved automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {NOTIF_PREFS.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                  <Switch checked={prefs[key]} onCheckedChange={(val) => handleTogglePref(key, val)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SECURITY ── */}
        <TabsContent value="security" className="mt-6 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Change Password */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" /> Change Password
                </CardTitle>
                <CardDescription>Update your login password</CardDescription>
              </CardHeader>
              <CardContent >
                <div className="space-y-3">
                  <div>
                    <Label>Current Password</Label>
                    <Input type="password" value={passwords.current}
                      onChange={e => setPasswords({ ...passwords, current: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label>New Password</Label>
                    <Input type="password" value={passwords.next}
                      onChange={e => setPasswords({ ...passwords, next: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label>Confirm New Password</Label>
                    <Input type="password" value={passwords.confirm}
                      onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} className="mt-1" />
                  </div>
                  <Button onClick={handleChangePassword} variant="outline" className="mt-2">
                    <Lock className="h-4 w-4 mr-2" />Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>
            {/* MFA */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" /> Two-Factor Authentication
                </CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* ── IDLE: not set up yet ── */}
                {mfaStep === 'idle' && (
                  <>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Not yet enabled</p>
                        <p className="text-xs text-amber-600 mt-0.5">2FA is currently disabled for your account.</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">
                      When enabled, you'll be asked for a verification code from your authenticator app each time you sign in.
                    </p>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Compatible apps</p>
                      <div className="flex flex-wrap gap-2">
                        {['Google Authenticator', 'Authy', 'Microsoft Authenticator'].map(app => (
                          <span key={app} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{app}</span>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full bg-[#005f27] hover:bg-[#436a36] text-white" onClick={startSetup}>
                      <Smartphone className="h-4 w-4 mr-2" /> Set Up Authenticator App
                    </Button>
                  </>
                )}


                {/* ── SETUP: scan QR + enter code ── */}
                {mfaStep === 'scanning' && (
                  showBackupCodes ? (
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
                      <Button onClick={handleDone} className="w-full bg-[#005f27] hover:bg-[#436a36] text-white h-10">
                        Done
                      </Button>
                    </>
                  ) : (<>
                    <p className="text-sm text-slate-600 font-medium">Step 1 — Scan this QR code with your authenticator app</p>
                    <div className="flex justify-center">
                      <img
                        src={qrCode}
                        alt="MFA QR Code"
                        className="rounded-lg border border-slate-200 p-2 bg-white"
                        width={160}
                        height={160}
                      />
                    </div>
                    <p className="text-sm text-slate-600 font-medium">Step 2 — Enter the 6-digit code from your app</p>
                    <Input
                      placeholder="000 000"
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-lg tracking-widest font-mono"
                      maxLength={6}
                    />
                    {mfaCodeError && <p className="text-red-500 text-sm">{mfaCodeError}</p>}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setMfaStep('idle'); setMfaCode(''); }}>
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-[#005f27] hover:bg-[#436a36] text-white"
                        disabled={mfaCode.length !== 6}
                        onClick={verifyCode}
                      >
                        Verify & Enable
                      </Button>
                    </div>
                  </>)
                )}

                {/* ── ACTIVE: 2FA enabled ── */}
                {mfaStep === 'done' && (
                  <>
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">2FA is active</p>
                        <p className="text-xs text-emerald-700 mt-1">
                          You'll be asked for a verification code from your authenticator app on every login.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={disableMfa}
                    >
                      Disable 2FA
                    </Button>
                  </>
                )}

                {/* ── DISABLING: confirm with current code ── */}
                {mfaStep === 'disabling' && (
                  <>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-100">
                      <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-rose-800">Confirm to disable 2FA</p>
                        <p className="text-xs text-rose-600 mt-0.5">Enter the current 6-digit code from your authenticator app to confirm.</p>
                      </div>
                    </div>
                    <Input
                      placeholder="000 000"
                      value={disableCode}
                      onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-lg tracking-widest font-mono"
                      maxLength={6}
                    />
                    {mfaCodeError && <p className="text-red-500 text-sm">{mfaCodeError}</p>}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setMfaStep('done'); setDisableCode(''); }}>
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                        disabled={disableCode.length !== 6}
                        onClick={confirmDisableMfa}
                      >
                        Confirm Disable
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Account role */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-2">Account</h3>
              <p className="text-sm text-slate-500">
                Your account role:{' '}
                <span className="font-medium capitalize">
                  {user?.platform_role ? user.platform_role.replace(/_/g, ' ') :
                    activeClientRole ? activeClientRole.replace(/_/g, ' ') : 'User'}
                </span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}