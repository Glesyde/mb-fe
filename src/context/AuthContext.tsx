import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authService } from "../services/auth.service";
import { sessionRestoreService } from "../services/session-restore.service";
import { UserProfile, UserRole, AppModule } from "../types";

// Extend the UserProfile type locally so TypeScript knows about our new variables
type ExtendedUserProfile = UserProfile & {
  pwd_warning?: boolean;
  // pwd_minutes_left?: number;
  pwd_days_left?: number; // <-- Changed to Days
  full_name?: string;
};

interface AuthContextType {
  user: ExtendedUserProfile | null;
  roles: string[];
  permissions: string[];
  modules: AppModule[];
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<ExtendedUserProfile | null>;
  logout: () => Promise<void>;
  saveCurrentSession: (path: string, state?: any) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<ExtendedUserProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [modules, setModules] = useState<AppModule[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Normalizes the backend response to match the frontend UserProfile type
   */
  const mapUserData = (data: any): ExtendedUserProfile => {
    console.debug("[AUTH_DEBUG] Mapping User Data from Backend:", data);

    // Get primary role
    const rawRole = (data.roles && data.roles[0]?.name) || "hospital_admin";

    // Comprehensive map of backend snake_case roles to frontend Title Case roles
    const roleMap: Record<string, UserRole> = {
      super_admin: "Admin",
      hospital_admin: "Admin",
      doctor: "Doctor",
      nurse: "Nurse",
      front_desk: "Front Desk",
      receptionist: "Front Desk",
      pharmacist: "Pharmacist",
      lab_scientist: "Lab Tech",
      radiologist: "Lab Tech",
      billing: "Accountant",
      accountant: "Accountant",
      inventory: "Inventory Manager",
      customer_service: "Front Desk",
    };

    const resolvedUserId = Number(
      data.id ?? data.user_id ?? data.staff_id ?? data.staff?.id ?? 0,
    );

    const mappedUser: ExtendedUserProfile = {
      id:
        Number.isFinite(resolvedUserId) && resolvedUserId > 0
          ? resolvedUserId
          : undefined,
      name: data.full_name || data.name || data.username || "Staff Member",
      role: roleMap[rawRole] || "Admin",
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username || data.name || "staff"}`,
      department: data.department || "General Services",
      // 👇 THE FIX: Capture the password warning data from the backend
      pwd_warning: data.pwd_warning,
      pwd_days_left: data.pwd_days_left, // <-- Changed to Days
      // pwd_minutes_left: data.pwd_minutes_left,
    };

    console.debug("[AUTH_DEBUG] Normalized UserProfile:", mappedUser);
    return mappedUser;
  };

  const ignoreInit = React.useRef(false);

  useEffect(() => {
    let ignore = false;

    const initialize = async () => {
      console.debug("[AUTH_DEBUG] Initializing session check...");
      setLoading(true);
      try {
        const data = await authService.getMe();
        if (!ignore && !ignoreInit.current) {
          if (data) {
            setUser(mapUserData(data));
            setRoles(data.roles?.map((r: any) => typeof r === "string" ? r : r.name) || []);
            setPermissions(data.permissions || []);
            setModules(data.modules || []);
          } else {
            setUser(null);
            setRoles([]);
            setPermissions([]);
            setModules([]);
          }
        }
      } catch (error: any) {
        console.warn("[AUTH_DEBUG] Session check failed");
        if (!ignore && !ignoreInit.current) {
          setUser(null);
          setRoles([]);
          setPermissions([]);
          setModules([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      ignore = true;
    };
  }, []);

  const login = async (username: string, password: string): Promise<ExtendedUserProfile | null> => {
    ignoreInit.current = true;
    setLoading(true);
    try {
      await authService.login(username, password);
      const data = await authService.getMe();
      if (data) {
        const mappedUser = mapUserData(data);
        setUser(mappedUser);
        setRoles(data.roles?.map((r: any) => typeof r === "string" ? r : r.name) || []);
        setPermissions(data.permissions || []);
        setModules(data.modules || []);
        return mappedUser;
      }
      return null;
    } catch (error) {
      setUser(null);
      setRoles([]);
      setPermissions([]);
      setModules([]);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentSession = (path: string, state?: any) => {
    if (user?.id) {
      sessionRestoreService.saveSession(user.id, path, state ?? null);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setRoles([]);
      setPermissions([]);
      setModules([]);
    }
  };

  const hasPermission = (permissionName: string) => {
    if (roles.includes("super_admin") || permissions.includes("*")) {
      return true;
    }

    const result = permissions.includes(permissionName);
    if (!result) {
      console.warn(
        `[AUTH_DEBUG] Permission Denied: User lacks '${permissionName}'. User permissions:`,
        permissions,
      );
    }
    return result;
  };

  const hasAnyPermission = (permissionNames: string[]) => {
    if (!permissionNames.length || roles.includes("super_admin") || permissions.includes("*")) {
      return true;
    }

    return permissionNames.some((permissionName) =>
      permissions.includes(permissionName),
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        permissions,
        modules,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        saveCurrentSession,
        hasPermission,
        hasAnyPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};


// import React, {
//   createContext,
//   useContext,
//   useState,
//   useEffect,
//   useCallback,
// } from "react";
// import { authService } from "../services/auth.service";
// import { sessionRestoreService } from "../services/session-restore.service";
// import { UserProfile, UserRole, AppModule } from "../types";

// interface AuthContextType {
//   user: UserProfile | null;
//   roles: string[];
//   permissions: string[];
//   modules: AppModule[];
//   isAuthenticated: boolean;
//   loading: boolean;
//   login: (username: string, password: string) => Promise<UserProfile | null>;
//   logout: () => Promise<void>;
//   saveCurrentSession: (path: string, state?: any) => void;
//   hasPermission: (permission: string) => boolean;
//   hasAnyPermission: (permissions: string[]) => boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
//   children,
// }) => {
//   const [user, setUser] = useState<UserProfile | null>(null);
//   const [roles, setRoles] = useState<string[]>([]);
//   const [permissions, setPermissions] = useState<string[]>([]);
//   const [modules, setModules] = useState<AppModule[]>([]);
//   const [loading, setLoading] = useState(true);

//   /**
//    * Normalizes the backend response to match the frontend UserProfile type
//    */
//   const mapUserData = (data: any): UserProfile => {
//     console.debug("[AUTH_DEBUG] Mapping User Data from Backend:", data);

//     // Get primary role
//     const rawRole = (data.roles && data.roles[0]?.name) || "hospital_admin";

//     // Comprehensive map of backend snake_case roles to frontend Title Case roles
//     const roleMap: Record<string, UserRole> = {
//       super_admin: "Admin",
//       hospital_admin: "Admin",
//       doctor: "Doctor",
//       nurse: "Nurse",
//       front_desk: "Front Desk",
//       receptionist: "Front Desk",
//       pharmacist: "Pharmacist",
//       lab_scientist: "Lab Tech",
//       radiologist: "Lab Tech",
//       billing: "Accountant",
//       accountant: "Accountant",
//       inventory: "Inventory Manager",
//       customer_service: "Front Desk",
//     };

//     const resolvedUserId = Number(
//       data.id ?? data.user_id ?? data.staff_id ?? data.staff?.id ?? 0,
//     );

//     const mappedUser: UserProfile = {
//       id:
//         Number.isFinite(resolvedUserId) && resolvedUserId > 0
//           ? resolvedUserId
//           : undefined,
//       name: data.full_name || data.name || data.username || "Staff Member",
//       role: roleMap[rawRole] || "Admin",
//       avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username || data.name || "staff"}`,
//       department: data.department || "General Services",
//     };

//     console.debug("[AUTH_DEBUG] Normalized UserProfile:", mappedUser);
//     return mappedUser;
//   };

//   const ignoreInit = React.useRef(false);

//   useEffect(() => {
//     let ignore = false;

//     const initialize = async () => {
//       console.debug("[AUTH_DEBUG] Initializing session check...");
//       setLoading(true);
//       try {
//         const data = await authService.getMe();
//         if (!ignore && !ignoreInit.current) {
//           if (data) {
//             setUser(mapUserData(data));
//             setRoles(data.roles?.map((r: any) => typeof r === "string" ? r : r.name) || []);
//             setPermissions(data.permissions || []);
//             setModules(data.modules || []);
//           } else {
//             setUser(null);
//             setRoles([]);
//             setPermissions([]);
//             setModules([]);
//           }
//         }
//       } catch (error: any) {
//         console.warn("[AUTH_DEBUG] Session check failed");
//         if (!ignore && !ignoreInit.current) {
//           setUser(null);
//           setRoles([]);
//           setPermissions([]);
//           setModules([]);
//         }
//       } finally {
//         if (!ignore) {
//           setLoading(false);
//         }
//       }
//     };

//     initialize();

//     return () => {
//       ignore = true;
//     };
//   }, []);

//   const login = async (username: string, password: string): Promise<UserProfile | null> => {
//     ignoreInit.current = true;
//     setLoading(true);
//     try {
//       await authService.login(username, password);
//       const data = await authService.getMe();
//       if (data) {
//         const mappedUser = mapUserData(data);
//         setUser(mappedUser);
//         setRoles(data.roles?.map((r: any) => typeof r === "string" ? r : r.name) || []);
//         setPermissions(data.permissions || []);
//         setModules(data.modules || []);
//         return mappedUser;
//       }
//       return null;
//     } catch (error) {
//       setUser(null);
//       setRoles([]);
//       setPermissions([]);
//       setModules([]);
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   };

//   const saveCurrentSession = (path: string, state?: any) => {
//     if (user?.id) {
//       sessionRestoreService.saveSession(user.id, path, state ?? null);
//     }
//   };

//   const logout = async () => {
//     try {
//       await authService.logout();
//     } finally {
//       setUser(null);
//       setRoles([]);
//       setPermissions([]);
//       setModules([]);
//     }
//   };

//   const hasPermission = (permissionName: string) => {
//     if (roles.includes("super_admin") || permissions.includes("*")) {
//       return true;
//     }

//     const result = permissions.includes(permissionName);
//     if (!result) {
//       console.warn(
//         `[AUTH_DEBUG] Permission Denied: User lacks '${permissionName}'. User permissions:`,
//         permissions,
//       );
//     }
//     return result;
//   };

//   const hasAnyPermission = (permissionNames: string[]) => {
//     if (!permissionNames.length || roles.includes("super_admin") || permissions.includes("*")) {
//       return true;
//     }

//     return permissionNames.some((permissionName) =>
//       permissions.includes(permissionName),
//     );
//   };

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         roles,
//         permissions,
//         modules,
//         isAuthenticated: !!user,
//         loading,
//         login,
//         logout,
//         saveCurrentSession,
//         hasPermission,
//         hasAnyPermission,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// };
