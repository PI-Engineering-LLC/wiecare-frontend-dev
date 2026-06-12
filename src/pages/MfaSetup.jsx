import { useState } from 'react';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext'; // Import useAuth
import { useNavigate } from 'react-router-dom'; // Import useNavigate

export default function MfaSetup() {
    const [qrCode, setQrCode] = useState(null);
    const [mfaCode, setMfaCode] = useState('');
    const [mfaStep, setMfaStep] = useState('idle'); // idle | scanning | verifying | done_show_codes | done
    const [mfaCodeError, setMfaCodeError] = useState('');
    const [backupCodes, setBackupCodes] = useState(null); // New state for backup codes
    const { login } = useAuth(); 
    const navigate = useNavigate();

    const startSetup = async () => {
        setMfaStep('scanning');
        try {
            const res = await api.setupMfa();
            setQrCode(res.qrCode);
        } catch (err) {
            console.error("Error setting up MFA:", err);
            setMfaCodeError('Failed to generate QR code. Please try again.');
            setMfaStep('idle');
        }
        
    };

    const verifyCode = async (e) => {
        e.preventDefault();
        setMfaCodeError(''); 
        setMfaStep('verifying');
        try {
            const res = await api.verifyMfa({
                mfaCode,
            });
            
            if (res.backup_codes && res.backup_codes.length > 0) {
                setBackupCodes(res.backup_codes);
                setMfaStep('done_show_codes'); // Transition to showing backup codes
            } else {
                setMfaStep('done'); // If no backup codes (e.g., already enabled), just show success
            }
        } catch (err){
            setMfaCodeError(err.response?.data?.error || 'Invalid code. Try again.');
            setMfaStep('scanning'); // Go back to scanning state for another attempt
        }
    };
    const handleContinueToDashboard = () => {
        navigate('/'); // Navigate after user acknowledges backup codes
    };

    return (
        <div className="max-w-md mx-auto mt-20 p-8 border rounded-xl">
            <h1 className="text-2xl font-bold mb-6">Two-Factor Authentication</h1>

            {mfaStep === 'idle' && (
                <div>
                    <p className="text-gray-600 mb-6">
                        Add an extra layer of security. You'll use Google Authenticator 
                        or Authy to generate login codes.
                    </p>
                    <button
                        onClick={startSetup}
                        className="w-full bg-black text-white p-3 rounded-lg"
                    >
                        Set Up 2FA
                    </button>
                </div>
            )}

            {mfaStep === 'scanning' && (
                <div>
                    <p className="text-gray-600 mb-4">
                        Scan this QR code with your authenticator app:
                    </p>
                    {qrCode ? (<img src={qrCode} alt="QR Code" className="mx-auto mb-6 border rounded-lg p-2" />)
                     : (
                        <div className="h-40 w-40 flex items-center justify-center mx-auto mb-6 bg-slate-100 rounded-lg">
                            <span className="text-slate-500">Loading QR...</span>
                        </div>
                    )}
                    <form onSubmit={verifyCode} className="space-y-4">
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Enter 6-digit code"
                            value={mfaCode}
                            onChange={e => setMfaCode(e.target.value)}
                            maxLength={6}
                            className="w-full border p-3 rounded-lg text-center text-2xl tracking-widest"
                        />
                        {mfaCodeError && <p className="text-red-500 text-sm">{mfaCodeError}</p>}
                        <button type="submit" className="w-full bg-black text-white p-3 rounded-lg">
                            Confirm & Enable
                        </button>
                    </form>
                </div>
            )}
            {mfaStep === 'done_show_codes' && (
                <div className="text-center">
                    <div className="text-green-500 text-5xl mb-4">✓</div>
                    <p className="text-xl font-semibold">2FA is now active!</p>
                    <p className="text-gray-500 mt-2 mb-6">
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
                    <button onClick={handleContinueToDashboard} className="w-full bg-black text-white p-3 rounded-lg">
                        Continue to Dashboard
                    </button>
                </div>
            )}

            {mfaStep === 'done' && (
                <div className="text-center">
                    <div className="text-green-500 text-5xl mb-4">✓</div>
                    <p className="text-xl font-semibold">2FA is now active!</p>
                    <p className="text-gray-500 mt-2">
                        You'll be asked for a code on every login.
                    </p>
                    <button onClick={handleContinueToDashboard} className="w-full bg-black text-white p-3 rounded-lg">
                        Go to Dashboard
                    </button>
                </div>
            )}
        </div>
    );
}