import React, { useState } from 'react';
import { useDB } from '../db/DatabaseContext';
import bcrypt from 'bcryptjs';

const ForgotPasswordModal = ({ onClose, initialUsername }) => {
    const { runQuery } = useDB();
    const [step, setStep] = useState(1); // 1: Username, 2: Answer, 3: New Password
    const [username, setUsername] = useState(initialUsername || '');
    const [question, setQuestion] = useState('');
    const [storedAnswerHash, setStoredAnswerHash] = useState('');
    const [inputAnswer, setInputAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [msg, setMsg] = useState('');

    const handleCheckUser = async (e) => {
        e.preventDefault();
        setMsg('');
        try {
            const res = await runQuery("SELECT security_question, security_answer FROM users WHERE username = ?", [username]);
            if (!res || res.length === 0) {
                setMsg("User not found.");
                return;
            }
            if (!res[0].security_question || !res[0].security_answer) {
                setMsg("Account recovery not set up for this user. Please contact Admin.");
                return;
            }
            setQuestion(res[0].security_question);
            setStoredAnswerHash(res[0].security_answer);
            setStep(2);
        } catch (err) {
            console.error(err);
            setMsg("Error looking up user.");
        }
    };

    const handleVerifyAnswer = async (e) => {
        e.preventDefault();
        setMsg('');
        try {
            const isMatch = await bcrypt.compare(inputAnswer.trim().toLowerCase(), storedAnswerHash);
            if (isMatch) {
                setStep(3);
            } else {
                setMsg("Incorrect answer.");
            }
        } catch (err) {
            console.error(err);
            setMsg("Error verifying answer.");
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setMsg('');
        if (!newPassword) {
            setMsg("Please enter a new password.");
            return;
        }

        try {
            const hash = await bcrypt.hash(newPassword, 10);
            await runQuery("UPDATE users SET password = ? WHERE username = ?", [hash, username]);
            setMsg("Password Reset Successfully!");
            setTimeout(onClose, 2000);
        } catch (err) {
            console.error(err);
            setMsg("Error resetting password.");
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-card)' }}>
                <h3>Forgot Password</h3>

                {msg && <div style={{ marginBottom: '1rem', color: msg.includes('Success') ? 'green' : 'red', fontWeight: 'bold' }}>{msg}</div>}

                {step === 1 && (
                    <form onSubmit={handleCheckUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>Enter your username to find your security question.</p>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" onClick={onClose} className="btn" style={{ flex: 1, background: 'var(--bg-input)' }}>Cancel</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Next</button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyAnswer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ fontWeight: 'bold' }}>Question: {question}</p>
                        <input
                            type="text"
                            placeholder="Your Answer"
                            value={inputAnswer}
                            onChange={e => setInputAnswer(e.target.value)}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="button" onClick={() => setStep(1)} className="btn" style={{ flex: 1, background: 'var(--bg-input)' }}>Back</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Verify</button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>Identity Verified. Set a new password.</p>
                        <input
                            type="text"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {/* No Back button from step 3 for security flow simplicity */}
                            <button type="button" onClick={onClose} className="btn" style={{ flex: 1, background: 'var(--bg-input)' }}>Cancel</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Reset Password</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordModal;
