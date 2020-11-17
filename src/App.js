import React, { useRef, useState } from 'react';
import firebase from 'firebase/app';
import "./App.css";
import 'firebase/firestore';
import 'firebase/auth';
import FirebaseAuth from 'react-firebaseui/FirebaseAuth';

import { useCollectionData } from 'react-firebase-hooks/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

firebase.initializeApp({
  apiKey: "AIzaSyC7CSN9sTBzeqrdERl1msYKlTO_SP6QFVA",
  authDomain: "nosknut-firebase-chat.firebaseapp.com",
  databaseURL: "https://nosknut-firebase-chat.firebaseio.com",
  projectId: "nosknut-firebase-chat",
  storageBucket: "nosknut-firebase-chat.appspot.com",
  messagingSenderId: "431091618442",
  appId: "1:431091618442:web:5c31d5c7580185c6055373"
});

// Configure FirebaseUI.
const uiConfig = {
  // Popup signin flow rather than redirect flow.
  signInFlow: 'popup',
  // We will display Google and Facebook as auth providers.
  signInOptions: [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
  ]
};

const auth = firebase.auth();
const firestore = firebase.firestore();

function ChatMessage({ message }) {
  const { text, uid, photoURL } = message;

  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return (
    <div className={`message ${messageClass}`}>
      <img alt="" src={photoURL} />
      <p>{text}</p>
    </div>
  );
}

export function ChatRoom() {
  const dummy = useRef();

  const messageRef = firestore.collection('messages');
  const query = messageRef.orderBy('createdAt').limit(25);

  const [messages] = useCollectionData(query, { idField: 'id' });

  const [formValue, setFormValue] = useState("");

  async function sendMessage(e) {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

    await messageRef.add({
      text: formValue,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid,
      photoURL,
    });
    setFormValue("");
    dummy.current.scrollIntoView({ behaviour: 'smooth' });
  }

  return (
    <>
      <main>
        {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        <span ref={dummy}></span>
      </main>

      <form className="message-form" onSubmit={sendMessage}>
        <input value={formValue} onChange={e => setFormValue(e.target.value)} placeholder="Say something nice" />

        <button type="submit" disabled={!formValue}>✈️</button>
      </form>
    </>
  )
}

function SignIn() {
  return (
    <>
      <FirebaseAuth uiConfig={uiConfig} firebaseAuth={auth} />
      <p className="community-warning">Do not violate the community guidelines or you will be banned for life!</p>
    </>
  );
}

function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => auth.signOut()}>Sign Out</button>
  );
}

function App() {
  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header>
        <h1>⚛️🔥💬</h1>
        <SignOut />
      </header>
      <section>
        {user ? <ChatRoom /> : <SignIn />}
      </section>
    </div>
  );
}

export default App;
