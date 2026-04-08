import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Loader2, Shield, User } from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import DeleteConfirmDialog from '../../components/admin/DeleteConfirmDialog';
import styles from './UsersPage.module.css';

interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles?.includes('Admin') ?? false;

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFirst, setFormFirst] = useState('');
  const [formLast, setFormLast] = useState('');
  const [formRole, setFormRole] = useState('Staff');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Access denied. Admin role required.</div>
      </div>
    );
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await apiFetch<AppUser[]>('/api/admin/users');
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!formEmail || !formPassword) {
      setFormError('Email and password are required.');
      return;
    }
    if (formPassword.length < 12) {
      setFormError('Password must be at least 12 characters.');
      return;
    }
    setCreating(true);
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: formEmail,
          password: formPassword,
          firstName: formFirst,
          lastName: formLast,
          role: formRole,
        }),
      });
      setShowForm(false);
      setFormEmail(''); setFormPassword(''); setFormFirst(''); setFormLast(''); setFormRole('Staff');
      fetchUsers();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      fetchUsers();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete user.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>User Management</h1>
          <p className={styles.subtitle}>Create and manage staff and admin accounts</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>
          <UserPlus size={15} />
          Create Account
        </button>
      </header>

      {/* Create form */}
      {showForm && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>New Account</h2>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formGrid}>
              <label className={styles.label}>
                First Name
                <input className={styles.input} value={formFirst} onChange={e => setFormFirst(e.target.value)} placeholder="First name" />
              </label>
              <label className={styles.label}>
                Last Name
                <input className={styles.input} value={formLast} onChange={e => setFormLast(e.target.value)} placeholder="Last name" />
              </label>
              <label className={styles.label}>
                Email *
                <input className={styles.input} type="email" required value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="user@beaconofhope.org" />
              </label>
              <label className={styles.label}>
                Password * (min 12 characters)
                <input className={styles.input} type="password" required value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="Create a password" />
              </label>
              <label className={styles.label}>
                Role *
                <select className={styles.select} value={formRole} onChange={e => setFormRole(e.target.value)}>
                  <option value="Staff">Staff</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>
            </div>
            {formError && <p className={styles.formError} role="alert">{formError}</p>}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className={styles.saveBtn} disabled={creating}>
                {creating ? <Loader2 size={14} className={styles.spinner} /> : <UserPlus size={14} />}
                {creating ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteError && <div className={styles.error}>{deleteError}</div>}

      {/* Users list */}
      {loading ? (
        <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /> Loading users...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className={styles.nameCell}>
                    {u.roles.includes('Admin') ? <Shield size={15} /> : <User size={15} />}
                    <span>{u.firstName} {u.lastName}</span>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`${styles.roleBadge} ${u.roles.includes('Admin') ? styles.roleAdmin : styles.roleStaff}`}>
                      {u.roles[0] || 'Staff'}
                    </span>
                  </td>
                  <td>
                    {u.email !== currentUser?.email && (
                      <button className={styles.deleteBtn} onClick={() => setDeleteTarget(u)} title="Delete user">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          title={`Delete ${deleteTarget.firstName} ${deleteTarget.lastName}?`}
          message={`This will permanently delete the account for ${deleteTarget.email}. This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={deleting}
        />
      )}
    </div>
  );
}
