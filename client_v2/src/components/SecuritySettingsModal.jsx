import React, { useState, useEffect } from 'react';
import { useDB } from '../db/DatabaseContext';
import bcrypt from 'bcryptjs';

const SecuritySettingsModal = ({ onClose, user }) => {
    const { runQuery } = useDB();
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [existingQuestion, setExistingQuestion] = useState(null);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const fetchCurrent = async () => {
            if (user?.username) {
                const res = await runQuery("SELECT security_question FROM users WHERE username = ?", [user.username]);
                if (res && res.length > 0 && res[0].security_question) {
                    setExistingQuestion(res[0].security_question);
                }
            }
        };
        fetchCurrent();
    }, [user, runQuery]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!question.trim() || !answer.trim()) {
            setMsg("Please fill both fields.");
            return;
        }

        try {
            // Hash the answer for privacy (so admins inspecting DB can't see it easily)
            // Note: For high security, we'd salt specifically, but simple bcrypt is fine.
            // Wait, for recovery, exact match is needed. bcrypt handles salt.
            const hashedAnswer = await bcrypt.hash(answer.trim().toLowerCase(), 10);

            await runQuery(
                "UPDATE users SET security_question = ?, security_answer = ? WHERE username = ?",
                [question.trim(), hashedAnswer, user.username]
            );

            setMsg("Security settings updated!");
            setTimeout(onClose, 1500);
        } catch (err) {
            console.error(err);
            setMsg("Error saving settings.");
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '90%', maxWidth: '400px', background: 'var(--bg-card)' }}>
                <h3>{existingQuestion ? "Update Security Question" : "Set Security Question"}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    This question will be used to recover your password if you forget it.
                </p>

                {msg && <div style={{ marginBottom: '1rem', color: msg.includes('Error') ? 'red' : 'green' }}>{msg}</div>}

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label>Question</label>
                        <input
                            type="text"
                            placeholder="e.g. What is your first pet's name?"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            list="questions"
                        />
                        <datalist id="questions">
                            <option value="What is your mother's maiden name?" />
                            <option value="What was the name of your first pet?" />
                            <option value="What was the first car you owned?" />
                            <option value="What elementary school did you attend?" />
                            <option value="What is the name of the town where you were born?" />
                        </datalist>
                    </div>

                    <div>
                        <label>Answer</label>
                        <input
                            type="text"
                            placeholder="Your answer..."
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                        />
                        <small style={{ color: 'var(--text-secondary)' }}>Answers are not case-sensitive (handled on verification).</small>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} className="btn" style={{ flex: 1, background: 'var(--bg-input)' }}>Cancel</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SecuritySettingsModal;
