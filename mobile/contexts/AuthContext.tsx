import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

//Type for the AuthContextValue
type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
};

//Create the AuthContext
const AuthContext = createContext<AuthContextValue | null>(null);

//Use the AuthContext
export function useAuth(): AuthContextValue {
  //Get the value from the AuthContext
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return value;
}
//Create the AuthProvider with the children
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  //Use the useEffect to get the session  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setIsLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = { session, isLoading };
  //Return the AuthContext.Provider with the children
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
