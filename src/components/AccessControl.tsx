import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldPlus,
  Settings2,
  ShieldAlert,
  X,
  CheckCircle2,
  Info,
  Save,
  Lock,
  Loader2,
} from "lucide-react";
import { useNotification } from "../context/NotificationContext";
import {
  permissionService,
  type Permission,
  type Role,
} from "../services/permission.service";

const formatLabel = (value: string) =>
  value.replace(/[._]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const buildEmptyRolePermissionMap = (
  roleList: Role[],
): Record<number, number[]> =>
  roleList.reduce<Record<number, number[]>>((acc, role) => {
    acc[role.id] = [];
    return acc;
  }, {});

const AccessControl: React.FC = () => {
  const { notify } = useNotification();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<
    Record<number, number[]>
  >({});
  const [savedRolePermissions, setSavedRolePermissions] = useState<
    Record<number, number[]>
  >({});
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadAccessControlData = async () => {
      setIsLoading(true);
      try {
        const [roleData, permissionData] = await Promise.all([
          permissionService.getRoles(),
          permissionService.getPermissions(),
        ]);

        setRoles(roleData);
        setPermissions(permissionData);

        const initialMap = buildEmptyRolePermissionMap(roleData);
        const rolePermissionResults = await Promise.allSettled(
          roleData.map((role) => permissionService.getRolePermissions(role.id)),
        );

        let failedRoleLoads = 0;

        rolePermissionResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            initialMap[roleData[index].id] = result.value.map(
              (permission) => permission.id,
            );
          } else {
            failedRoleLoads += 1;
          }
        });

        setRolePermissions({ ...initialMap });
        setSavedRolePermissions({ ...initialMap });

        if (failedRoleLoads > 0) {
          notify(
            `Loaded roles, but ${failedRoleLoads} permission set${failedRoleLoads === 1 ? "" : "s"} could not be retrieved.`,
            "warning",
          );
        }
      } catch (error: any) {
        notify(
          error?.response?.data?.message ||
            "Failed to load roles and permissions.",
          "error",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadAccessControlData();
  }, [notify]);

  const togglePermission = (roleId: number, permissionId: number) => {
    setRolePermissions((prev) => {
      const current = prev[roleId] || [];
      const updated = current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId];

      return { ...prev, [roleId]: updated };
    });
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    const roleName = newRoleName.trim();

    setShowAddRoleModal(false);
    setNewRoleName("");

    if (!roleName) {
      return;
    }

    notify(
      "Role creation is managed from the backend. New roles will appear here automatically once created.",
      "info",
    );
  };

  const handleSaveChanges = async () => {
    const newAssignments = roles.flatMap((role) => {
      const current = new Set(rolePermissions[role.id] || []);
      const saved = new Set(savedRolePermissions[role.id] || []);

      return [...current]
        .filter((permissionId) => !saved.has(permissionId))
        .map((permissionId) => ({
          role_id: role.id,
          permission_id: permissionId,
        }));
    });

    const removedAssignments = roles.flatMap((role) => {
      const current = new Set(rolePermissions[role.id] || []);
      const saved = new Set(savedRolePermissions[role.id] || []);

      return [...saved]
        .filter((permissionId) => !current.has(permissionId))
        .map((permissionId) => ({
          role_id: role.id,
          permission_id: permissionId,
        }));
    });

    if (!newAssignments.length && !removedAssignments.length) {
      notify("No permission changes to save yet.", "info");
      return;
    }

    setIsSaving(true);

    try {
      const [assignmentResults, removalResults] = await Promise.all([
        Promise.allSettled(
          newAssignments.map((payload) =>
            permissionService.assignRolePermission(payload),
          ),
        ),
        Promise.allSettled(
          removedAssignments.map((payload) =>
            permissionService.removeRolePermission(payload),
          ),
        ),
      ]);

      const successfulAssignments = newAssignments.filter(
        (_, index) => assignmentResults[index]?.status === "fulfilled",
      );
      const failedAssignments = assignmentResults.filter(
        (result) => result.status === "rejected",
      );
      const successfulRemovals = removedAssignments.filter(
        (_, index) => removalResults[index]?.status === "fulfilled",
      );
      const failedRemovals = removalResults.filter(
        (result) => result.status === "rejected",
      );

      if (successfulAssignments.length || successfulRemovals.length) {
        setSavedRolePermissions((prev) => {
          const next = { ...prev };

          successfulAssignments.forEach(({ role_id, permission_id }) => {
            const existing = new Set(next[role_id] || []);
            existing.add(permission_id);
            next[role_id] = [...existing];
          });

          successfulRemovals.forEach(({ role_id, permission_id }) => {
            next[role_id] = (next[role_id] || []).filter(
              (id) => id !== permission_id,
            );
          });

          return next;
        });
      }

      if (!failedAssignments.length && !failedRemovals.length) {
        const updateSummary = [
          successfulAssignments.length
            ? `${successfulAssignments.length} assignment${successfulAssignments.length === 1 ? "" : "s"}`
            : null,
          successfulRemovals.length
            ? `${successfulRemovals.length} removal${successfulRemovals.length === 1 ? "" : "s"}`
            : null,
        ]
          .filter(Boolean)
          .join(" and ");

        notify(
          updateSummary
            ? `Permissions updated successfully: ${updateSummary}.`
            : "No permission updates were applied.",
          "success",
        );
      } else if (successfulAssignments.length || successfulRemovals.length) {
        notify(
          `Permissions partially updated: ${successfulAssignments.length} assignment(s) saved, ${successfulRemovals.length} removal(s) saved, ${failedAssignments.length + failedRemovals.length} request(s) failed.`,
          "warning",
        );
      } else {
        notify("Failed to update the selected permissions.", "error");
      }
    } catch (error: any) {
      notify(
        error?.response?.data?.message || "Failed to update permissions.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Lock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Active Roles
            </p>
            <p className="text-xl font-black text-slate-800">
              {roles.length} Defined
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Permission Points
            </p>
            <p className="text-xl font-black text-slate-800">
              {permissions.length} Objects
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <ShieldAlert size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Security Mode
              </p>
              <p className="text-xl font-black text-slate-800">
                High Strictness
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[44px] shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Privilege Matrix
            </h2>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
              Define role-based clinical and administrative access protocols
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddRoleModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md active:scale-95"
            >
              <ShieldPlus size={14} /> Define Custom Role
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
              <Settings2 size={14} /> System Defaults
            </button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-30">
              <tr className="border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/95 sticky top-0 left-0 z-40 border-r border-slate-100 backdrop-blur-md">
                  Permissions \ Roles
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    title={role.description || role.name}
                    className="px-8 py-6 text-center text-xs font-black text-slate-800 border-r border-slate-50 last:border-r-0 uppercase tracking-widest min-w-[140px] bg-white/95 sticky top-0 z-30 backdrop-blur-md"
                  >
                    {formatLabel(role.name)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={Math.max(roles.length + 1, 2)}
                    className="px-8 py-10 text-center text-sm font-bold text-slate-400"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Loading
                      access control data...
                    </span>
                  </td>
                </tr>
              ) : permissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(roles.length + 1, 2)}
                    className="px-8 py-10 text-center text-sm font-bold text-slate-400"
                  >
                    No permissions available from the backend yet.
                  </td>
                </tr>
              ) : (
                permissions.map((permission) => (
                  <tr
                    key={permission.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-8 py-5 text-xs font-black text-slate-600 bg-white sticky left-0 z-20 border-r border-slate-100 backdrop-blur-md shadow-[6px_0_12px_-10px_rgba(15,23,42,0.18)]">
                      <div className="flex flex-col gap-1">
                        <span>
                          {permission.description ||
                            formatLabel(permission.code)}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                          {permission.module} • {permission.code}
                        </span>
                      </div>
                    </td>
                    {roles.map((role) => {
                      const isChecked =
                        rolePermissions[role.id]?.includes(permission.id) ||
                        false;

                      return (
                        <td
                          key={role.id}
                          className="px-8 py-5 text-center border-r border-slate-50 last:border-r-0"
                        >
                          <label className="flex justify-center cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isChecked}
                                onChange={() =>
                                  togglePermission(role.id, permission.id)
                                }
                              />
                              <div
                                className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center
                                  ${
                                    isChecked
                                      ? "bg-slate-900 border-slate-900 shadow-sm"
                                      : "bg-white border-slate-200 hover:border-slate-400"
                                  }
                                `}
                              >
                                {isChecked && (
                                  <CheckCircle2
                                    size={14}
                                    className="text-white"
                                  />
                                )}
                              </div>
                            </div>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-slate-400">
            <Info size={18} className="text-brand-active0" />
            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
              Caution: Permission assignments and removals are sent live to the
              backend. Review changes carefully before committing.
            </p>
          </div>
          <button
            onClick={handleSaveChanges}
            disabled={isSaving || isLoading}
            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Synchronizing...
              </>
            ) : (
              <>
                <Save size={14} /> Commit Changes
              </>
            )}
          </button>
        </div>
      </div>

      {showAddRoleModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowAddRoleModal(false)}
          />
          <form
            onSubmit={handleCreateRole}
            className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3 text-slate-800">
                <ShieldPlus size={20} />
                <h2 className="text-lg font-black tracking-tight uppercase">
                  Define Custom Role
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRoleModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Unique Role Title
                </label>
                <input
                  autoFocus
                  required
                  type="text"
                  placeholder="e.g. Clinical Auditor"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-8 focus:ring-slate-900/5 transition-all"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </div>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                <p className="text-[9px] text-amber-700 font-bold uppercase tracking-tight leading-relaxed">
                  New roles should be created from the backend setup. Once
                  available there, they will appear automatically in this
                  matrix.
                </p>
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddRoleModal(false)}
                className="px-5 py-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-slate-900 text-white px-8 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md active:scale-95 transition-all"
              >
                Register Role
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AccessControl;
