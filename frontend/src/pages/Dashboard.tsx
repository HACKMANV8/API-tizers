/**
 * Dashboard Page
 *
 * Shows user profile and linked platform accounts
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';

interface Account {
  id: string;
  platform: string;
  accountId: string;
  createdAt: string;
  _count: {
    snapshots: number;
  };
}

export function Dashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkPlatform, setLinkPlatform] = useState('LEETCODE');
  const [linkAccountId, setLinkAccountId] = useState('');
  const [linkError, setLinkError] = useState('');

  const platforms = [
    { value: 'LEETCODE', label: 'LeetCode', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'CODEFORCES', label: 'Codeforces', color: 'bg-blue-100 text-blue-800' },
    { value: 'CODECHEF', label: 'CodeChef', color: 'bg-brown-100 text-brown-800' },
    { value: 'ATCODER', label: 'AtCoder', color: 'bg-gray-100 text-gray-800' },
    { value: 'GITHUB', label: 'GitHub', color: 'bg-purple-100 text-purple-800' },
  ];

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await apiClient.getAccounts();
      setAccounts(response.data.accounts);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError('');

    try {
      await apiClient.linkAccount(linkPlatform, linkAccountId);
      setLinkAccountId('');
      setShowLinkForm(false);
      loadAccounts();
    } catch (error: any) {
      setLinkError(error.response?.data?.message || 'Failed to link account');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to unlink this account?')) return;

    try {
      await apiClient.deleteAccount(accountId);
      loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const getPlatformColor = (platform: string) => {
    return platforms.find((p) => p.value === platform)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage your profile and connected accounts</p>
      </div>

      {/* User Profile Card */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Profile</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Username:</span>
            <span className="font-medium">{user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Role:</span>
            <span className={`badge ${user?.role === 'ADMIN' ? 'badge-warning' : 'badge-primary'}`}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Linked Accounts */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Linked Accounts</h2>
          <button
            onClick={() => setShowLinkForm(!showLinkForm)}
            className="btn btn-primary"
          >
            {showLinkForm ? 'Cancel' : '+ Link Account'}
          </button>
        </div>

        {/* Link Account Form */}
        {showLinkForm && (
          <form onSubmit={handleLinkAccount} className="mb-6 p-4 bg-gray-50 rounded-lg">
            {linkError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {linkError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform
                </label>
                <select
                  value={linkPlatform}
                  onChange={(e) => setLinkPlatform(e.target.value)}
                  className="input"
                >
                  {platforms.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username/Account ID
                </label>
                <input
                  type="text"
                  required
                  value={linkAccountId}
                  onChange={(e) => setLinkAccountId(e.target.value)}
                  placeholder="your-username"
                  className="input"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-4">
              Link Account
            </button>
          </form>
        )}

        {/* Accounts List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No accounts linked yet. Link your first account to start tracking!
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <span className={`badge ${getPlatformColor(account.platform)}`}>
                    {account.platform}
                  </span>
                  <div>
                    <p className="font-medium">{account.accountId}</p>
                    <p className="text-sm text-gray-500">
                      {account._count.snapshots} snapshots
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Unlink
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
