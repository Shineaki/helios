import { createContext, useEffect, useReducer, useState } from "react";

import { initializeApp } from "firebase/app";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getFirestore, getDoc, setDoc, doc } from "firebase/firestore";

import { firebaseConfig } from "../config";

const INITIALIZE = "INITIALIZE";
const app = initializeApp(firebaseConfig);
const fireauth = getAuth(app);
const firestore = getFirestore(app);

const initialState = {
  isAuthenticated: false,
  isInitialized: false,
  user: null,
};

const reducer = (state, action) => {
  if (action.type === INITIALIZE) {
    const { isAuthenticated, user } = action.payload;
    return {
      ...state,
      isAuthenticated,
      isInitialized: true,
      user,
    };
  }

  return state;
};

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [profile, setProfile] = useState();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(
    () =>
      fireauth.onAuthStateChanged((user) => {
        if (user) {
          // const col = collection(firestore, "users", );
          getDoc(doc(firestore, "users", user.uid))
            .then((doc) => {
              if (doc.exists) {
                setProfile(doc.data());
              }
            })
            .catch((error) => {
              console.error(error);
            });

          dispatch({
            type: INITIALIZE,
            payload: { isAuthenticated: true, user },
          });
        } else {
          dispatch({
            type: INITIALIZE,
            payload: { isAuthenticated: false, user: null },
          });
        }
      }),
    [dispatch]
  );

  const signIn = (email, password) =>
    signInWithEmailAndPassword(fireauth, email, password);

  const signUp = (email, password, firstName, lastName) =>
    createUserWithEmailAndPassword(fireauth, email, password).then((res) => {
      setDoc(doc(firestore, "users", res.user?.uid), {
        uid: res.user?.uid,
        email,
        displayName: `${firstName} ${lastName}`,
      });
    });

  const signOut = async () => {
    await fireauth.signOut();
  };

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(fireauth, email);
  };

  const auth = { ...state.user };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        method: "firebase",
        user: {
          id: auth.uid,
          email: auth.email,
          avatar: auth.avatar || profile?.avatar,
          displayName: auth.displayName || profile?.displayName,
          role: "user",
        },
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext, AuthProvider };
