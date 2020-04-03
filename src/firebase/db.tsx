// TODO: Only initialize on client-side (no server-side authentication).

import { createContext, useContext } from 'react' 

import { DocumentReference } from '@firebase/firestore-types'
import firebase from './index'

type DBContextAlias = undefined | DocumentReference;

export const DBContext = createContext(
  (typeof window !== 'undefined' ? 
    firebase.firestore().collection('partitions').doc('default') : 
    undefined) as DBContextAlias
)

export const useDB = () => useContext(DBContext)

export default function DBProvider(
  { children }: { children: JSX.Element[] | JSX.Element; }
) {
  const db: DBContextAlias = typeof window === 'undefined' ? 
    undefined : process.env.NODE_ENV === 'development' ? 
    firebase.firestore().collection('partitions').doc('test') : 
    firebase.firestore().collection('partitions').doc('default');
  return (
    <DBContext.Provider value={db}>
      {children}
    </DBContext.Provider>
  );
}
