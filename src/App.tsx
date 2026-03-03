import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, LogOut, CheckCircle, XCircle, RefreshCw, AlertCircle, Terminal } from 'lucide-react';

interface Filter {
  id: number;
  keyword: string;
  response: string;
  is_exact_match: boolean;
  created_at: string;
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [filters, setFilters] = useState<Filter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<Partial<Filter>>({ keyword: '', response: '', is_exact_match: false });
  
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);

  useEffect(() => {
    if (token) {
      fetchFilters();
      fetchWebhookInfo();
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        localStorage.setItem('admin_token', data.token);
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('Network error');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('admin_token');
    setFilters([]);
  };

  const fetchFilters = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/filters', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFilters(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to fetch filters', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWebhookInfo = async () => {
    try {
      const res = await fetch('/api/telegram/webhook-info', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWebhookInfo(data.result);
      }
    } catch (err) {
      console.error('Failed to fetch webhook info', err);
    }
  };

  const registerWebhook = async () => {
    setIsRegisteringWebhook(true);
    try {
      const res = await fetch('/api/telegram/register-webhook', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchWebhookInfo();
      } else {
        alert('Failed to register webhook. Check server logs.');
      }
    } catch (err) {
      console.error('Failed to register webhook', err);
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  const saveFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = currentFilter.id ? `/api/filters/${currentFilter.id}` : '/api/filters';
      const method = currentFilter.id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(currentFilter)
      });
      
      if (res.ok) {
        setIsEditing(false);
        setCurrentFilter({ keyword: '', response: '', is_exact_match: false });
        fetchFilters();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save filter');
      }
    } catch (err) {
      console.error('Failed to save filter', err);
    }
  };

  const deleteFilter = async (id: number) => {
    if (!confirm('Are you sure you want to delete this filter?')) return;
    try {
      const res = await fetch(`/api/filters/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchFilters();
      }
    } catch (err) {
      console.error('Failed to delete filter', err);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #39FF14 0%, transparent 40%)',
          filter: 'blur(100px)'
        }}></div>
        
        <div className="max-w-md w-full bg-[#111111] rounded-xl border border-[#39FF14]/30 p-8 glow-border relative z-10">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center text-[#39FF14] border border-[#39FF14]/50 glow-border-active bg-[#39FF14]/5">
              <Terminal size={32} />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-center text-[#39FF14] mb-2 glow-text tracking-tight">DGNFilters</h1>
          <p className="text-center text-[#39FF14]/60 mb-8 font-mono text-sm uppercase tracking-widest">System Authentication</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ENTER ADMIN PASSWORD"
                className="w-full px-4 py-4 bg-[#050505] rounded-lg border border-[#39FF14]/30 focus:outline-none focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] transition-all text-white font-mono placeholder-[#39FF14]/30 text-center tracking-widest"
                required
              />
            </div>
            {loginError && <p className="text-red-500 font-mono text-sm text-center bg-red-500/10 py-2 rounded border border-red-500/30">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-[#39FF14] hover:bg-[#32e612] text-black font-bold py-4 rounded-lg transition-all uppercase tracking-widest hover:shadow-[0_0_20px_rgba(57,255,20,0.4)]"
            >
              Initialize Connection
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] font-sans text-white relative">
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none opacity-10" style={{
        backgroundImage: 'radial-gradient(circle at 50% 0%, #39FF14 0%, transparent 50%)',
        filter: 'blur(120px)'
      }}></div>

      {/* Header */}
      <header className="bg-[#111111]/80 backdrop-blur-md border-b border-[#39FF14]/20 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[#39FF14] border border-[#39FF14]/40 bg-[#39FF14]/10 glow-border">
              <Terminal size={20} />
            </div>
            <h1 className="text-2xl font-bold text-[#39FF14] glow-text tracking-tight">DGNFilters</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-[#39FF14]/60 hover:text-[#39FF14] transition-colors font-mono text-sm uppercase tracking-wider"
          >
            <LogOut size={16} />
            <span>Disconnect</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 relative z-10">
        {/* Webhook Status */}
        <section className="bg-[#111111] rounded-xl border border-[#39FF14]/30 p-6 glow-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Settings className="text-[#39FF14]" size={20} />
                System Status
              </h2>
              <div className="flex items-center space-x-2 font-mono text-sm">
                {webhookInfo?.url ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse shadow-[0_0_8px_#39FF14]"></div>
                    <span className="text-[#39FF14]/80">Bot Active - Filtering Data</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]"></div>
                    <span className="text-red-400">System Offline - Webhook Not Set</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={registerWebhook}
              disabled={isRegisteringWebhook}
              className="flex items-center space-x-2 px-6 py-3 bg-transparent border border-[#39FF14] hover:bg-[#39FF14]/10 text-[#39FF14] rounded-lg font-mono text-sm uppercase tracking-wider transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRegisteringWebhook ? 'animate-spin' : ''} />
              <span>{webhookInfo?.url ? 'Sync Connection' : 'Establish Connection'}</span>
            </button>
          </div>
          
          <div className="bg-[#050505] rounded-lg p-5 border border-[#39FF14]/20">
            <h3 className="text-sm font-mono text-[#39FF14] mb-3 uppercase tracking-widest flex items-center gap-2">
              <Terminal size={14} />
              Deployment Instructions
            </h3>
            <ol className="list-decimal list-inside text-sm text-gray-400 space-y-2 font-sans">
              <li>Open Telegram and navigate to the target Group Chat.</li>
              <li>Access Group Info by clicking the Group Name.</li>
              <li>Select <strong className="text-white">Add Members</strong>.</li>
              <li>Search for the bot's designated username and add it.</li>
              <li><strong className="text-[#39FF14]">CRITICAL:</strong> Navigate to Group Settings &gt; Administrators &gt; Add Admin &gt; Select the bot.</li>
              <li>Verify the bot possesses <strong className="text-white">"Delete Messages"</strong> or <strong className="text-white">"Read Messages"</strong> permissions.</li>
            </ol>
          </div>
        </section>

        {/* Filters Management */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Active Filters</h2>
            <button
              onClick={() => {
                setCurrentFilter({ keyword: '', response: '', is_exact_match: false });
                setIsEditing(true);
              }}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[#39FF14] hover:bg-[#32e612] text-black rounded-lg font-bold text-sm transition-all shadow-[0_0_15px_rgba(57,255,20,0.2)] hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] uppercase tracking-wider"
            >
              <Plus size={18} />
              <span>New Filter</span>
            </button>
          </div>

          {isEditing && (
            <div className="bg-[#111111] rounded-xl border border-[#39FF14] p-6 mb-8 glow-border-active relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#39FF14]"></div>
              <h3 className="text-lg font-bold text-[#39FF14] mb-6 uppercase tracking-widest font-mono">
                {currentFilter.id ? 'Modify Filter Protocol' : 'Initialize New Filter'}
              </h3>
              <form onSubmit={saveFilter} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono text-[#39FF14]/70 mb-2 uppercase tracking-widest">Trigger Keyword</label>
                    <input
                      type="text"
                      value={currentFilter.keyword}
                      onChange={(e) => setCurrentFilter({ ...currentFilter, keyword: e.target.value })}
                      placeholder="e.g. /website or Website"
                      className="w-full px-4 py-3 bg-[#050505] rounded-lg border border-[#39FF14]/30 focus:outline-none focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] text-white font-mono placeholder-gray-700 transition-colors"
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-3 mt-8 bg-[#050505] px-4 py-3 rounded-lg border border-[#39FF14]/10">
                    <input
                      type="checkbox"
                      id="exactMatch"
                      checked={currentFilter.is_exact_match}
                      onChange={(e) => setCurrentFilter({ ...currentFilter, is_exact_match: e.target.checked })}
                      className="w-5 h-5 text-[#39FF14] bg-[#050505] border-[#39FF14]/50 rounded focus:ring-[#39FF14] focus:ring-offset-0 focus:ring-offset-[#111111]"
                    />
                    <label htmlFor="exactMatch" className="text-sm text-gray-300 font-sans">
                      Strict Match <span className="text-gray-500 text-xs ml-1">(Message must be exactly this keyword)</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#39FF14]/70 mb-2 uppercase tracking-widest">Automated Response</label>
                  <textarea
                    value={currentFilter.response}
                    onChange={(e) => setCurrentFilter({ ...currentFilter, response: e.target.value })}
                    placeholder="Enter the payload to be transmitted..."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#050505] rounded-lg border border-[#39FF14]/30 focus:outline-none focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] text-white font-sans placeholder-gray-700 transition-colors resize-y"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-4 pt-4 border-t border-[#39FF14]/10">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2.5 text-gray-400 hover:text-white font-mono text-sm uppercase tracking-wider transition-colors"
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#39FF14] hover:bg-[#32e612] text-black rounded-lg font-bold text-sm uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(57,255,20,0.2)]"
                  >
                    Deploy Filter
                  </button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-20 text-[#39FF14]/50 font-mono uppercase tracking-widest animate-pulse">
              Retrieving Data...
            </div>
          ) : filters.length === 0 ? (
            <div className="bg-[#111111] rounded-xl border border-[#39FF14]/20 border-dashed p-16 text-center">
              <div className="w-16 h-16 bg-[#39FF14]/5 rounded-full flex items-center justify-center mx-auto mb-6 text-[#39FF14]/40 border border-[#39FF14]/20">
                <Terminal size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Database Empty</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">The filter matrix is currently devoid of parameters. Initialize your first keyword filter to commence operations.</p>
              <button
                onClick={() => {
                  setCurrentFilter({ keyword: '', response: '', is_exact_match: false });
                  setIsEditing(true);
                }}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-transparent border border-[#39FF14] hover:bg-[#39FF14]/10 text-[#39FF14] rounded-lg font-mono text-sm uppercase tracking-wider transition-all"
              >
                <Plus size={18} />
                <span>Initialize Filter</span>
              </button>
            </div>
          ) : (
            <div className="bg-[#111111] rounded-xl border border-[#39FF14]/30 overflow-hidden glow-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#050505] border-b border-[#39FF14]/20">
                      <th className="px-6 py-5 text-xs font-mono font-bold text-[#39FF14] uppercase tracking-widest">Trigger</th>
                      <th className="px-6 py-5 text-xs font-mono font-bold text-[#39FF14] uppercase tracking-widest">Payload</th>
                      <th className="px-6 py-5 text-xs font-mono font-bold text-[#39FF14] uppercase tracking-widest">Parameters</th>
                      <th className="px-6 py-5 text-xs font-mono font-bold text-[#39FF14] uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#39FF14]/10">
                    {filters.map((filter) => (
                      <tr key={filter.id} className="hover:bg-[#39FF14]/5 transition-colors group">
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center px-3 py-1 rounded border border-[#39FF14]/30 font-mono text-sm font-bold bg-[#050505] text-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.1)]">
                            {filter.keyword}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm text-gray-300 line-clamp-2 font-sans">{filter.response}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`text-xs font-mono uppercase tracking-wider px-2 py-1 rounded ${filter.is_exact_match ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                            {filter.is_exact_match ? 'Strict' : 'Contains'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right space-x-3">
                          <button
                            onClick={() => {
                              setCurrentFilter(filter);
                              setIsEditing(true);
                            }}
                            className="p-2 text-gray-500 hover:text-[#39FF14] transition-colors bg-[#050505] rounded border border-transparent hover:border-[#39FF14]/30"
                            title="Modify"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deleteFilter(filter.id)}
                            className="p-2 text-gray-500 hover:text-red-500 transition-colors bg-[#050505] rounded border border-transparent hover:border-red-500/30"
                            title="Terminate"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
