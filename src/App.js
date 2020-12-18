import React, { useRef, useState, useEffect } from 'react';
import firebase from 'firebase/app';
import "./App.css";
import 'firebase/firestore';
import 'firebase/auth';
import FirebaseAuth from 'react-firebaseui/FirebaseAuth';

import { useCollectionData, useDocumentData, useDocumentDataOnce, useDocumentOnce } from 'react-firebase-hooks/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { BrowserRouter as Router, Link, Redirect, Route, useHistory } from 'react-router-dom';

if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: "AIzaSyC7CSN9sTBzeqrdERl1msYKlTO_SP6QFVA",
    authDomain: "nosknut-firebase-chat.firebaseapp.com",
    databaseURL: "https://nosknut-firebase-chat.firebaseio.com",
    projectId: "nosknut-firebase-chat",
    storageBucket: "nosknut-firebase-chat.appspot.com",
    messagingSenderId: "431091618442",
    appId: "1:431091618442:web:5c31d5c7580185c6055373"
  });
}

// Configure FirebaseUI.
const uiConfig = {
  // Popup signin flow rather than redirect flow.
  signInFlow: 'popup',
  // We will display Google and Facebook as auth providers.
  signInOptions: [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    firebase.auth.EmailAuthProvider.PROVIDER_ID,
  ]
};

const auth = firebase.auth();
const firestore = firebase.firestore();

function ChatMessage({ message }) {
  const { text, uid, photoURL } = message;
  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return <>
    <div className={`message ${messageClass}`}>
      <img alt="" src={photoURL} />
      <p>{text}</p>
    </div>
  </>;
}

function useRefreshLastMsg(roomId, uid, messages, self, loading) {
  const lastMsgId = messages && messages.length && messages[0].id;
  const lastRead = self && self.lastReadMsg;
  useEffect(() => {
    if (!loading && lastMsgId && (lastMsgId !== lastRead)) {
      firestore.collection("chatRooms").doc(roomId).collection('users').doc(uid).set({ lastReadMsg: lastMsgId });
    }
  }, [roomId, uid, lastMsgId, lastRead, loading]);
}

function getMessageQuery(messageRef, lastMsgSnap, loadingLastMsg) {
  if (loadingLastMsg || !messageRef) {
    return null;
  }
  const query = messageRef.orderBy('createdAt', "desc");
  if (lastMsgSnap) {
    return query.endAt(lastMsgSnap);
  }
  return query.limit(5);
}

function AddUser({ roomId }) {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");

  function fetchUser(e) {
    e.preventDefault();
    auth
      .getUserByDisplayName(name)
      .then((userRecord) => {
        setUser(userRecord.toJSON())
        console.log(`Successfully fetched user data: ${userRecord.toJSON()}`);
      })
      .catch((error) => {
        console.warn('Error fetching user data:', error);
      });
  }

  return <>
    <header>
      <Link className="go-back" to={`/${roomId}`}>{"<"}</Link>
      <h1>Add user</h1>
      <div />
    </header>
    <section>
      <main>
        {JSON.stringify(user)}
      </main>
      <form className="message-form" onSubmit={fetchUser}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name of user" />

        <button type="submit" disabled={!name}>✈️</button>
      </form>
    </section>
  </>;
}

export function ChatRoom(props) {
  const { roomId } = props.match.params;
  const { history } = props;

  const { uid } = auth.currentUser;

  const dummy = useRef();
  const roomRef = firestore.collection("chatRooms").doc(roomId);
  const messageRef = roomRef.collection('messages');
  const roomUsersRef = roomRef.collection('users');
  const [room, loadingRoom] = useDocumentData(roomRef);
  const [self] = useDocumentDataOnce(roomUsersRef.doc(uid), { idField: 'uid' });
  const lastReadMsgId = self && self.lastReadMsg;
  const [lastMsgSnap, loadingLastMsg] = useDocumentOnce(lastReadMsgId && messageRef.doc(lastReadMsgId));
  const msgQuery = getMessageQuery(messageRef, lastMsgSnap, loadingLastMsg);
  const [messages, loadingMessages] = useCollectionData(msgQuery, { idField: 'id' });
  useRefreshLastMsg(roomId, uid, messages, self, loadingLastMsg && loadingMessages);

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

  const redirectOnRoomDelete = !room && !loadingRoom ? <Redirect to="/" /> : null;

  return (
    <>
      <Route path="/addUser"><AddUser roomId={roomId} /></Route>
      <Route path="/">
        {redirectOnRoomDelete}
        <header>
          <Link className="go-back" to="/">{"<"}</Link>
          <h1>{room && room.name}</h1>
          <div>
            <SignOut />
            {room && room.createdBy === uid ? <button onClick={() => history.push(roomId + "/addUser")} className="add-user-btn">+</button> : null}
          </div>
        </header>
        <section>
          <main>
            {messages && messages.map((msg) => <ChatMessage
              key={msg.id}
              message={msg}
            />
            )}
            <span ref={dummy}></span>
          </main>

          <form className="message-form" onSubmit={sendMessage}>
            <input value={formValue} onChange={e => setFormValue(e.target.value)} placeholder="Say something nice" />

            <button type="submit" disabled={!formValue}>✈️</button>
          </form>
        </section>
      </Route>
    </>
  )
}

function SignIn() {
  return (
    <section>
      <FirebaseAuth uiConfig={uiConfig} firebaseAuth={auth} />
      <p className="community-warning">Do not violate the community guidelines or you will be banned for life!</p>
    </section>
  );
}

function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => auth.signOut()}>Sign Out</button>
  );
}

function addUser(roomId, userId) {
  return firestore.collection("chatRooms").doc(roomId).collection("users").doc(userId).set({});
}

function RoomSelector() {
  const history = useHistory();
  const [name, setName] = useState('');
  const roomsRef = firestore.collection("chatRooms");

  const [rooms] = useCollectionData(roomsRef, { idField: 'id' });
  const { uid } = auth.currentUser;

  async function addRoom(e) {
    e.preventDefault();

    const docRef = await roomsRef.add({
      name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
    });
    await addUser(docRef.id, uid);
    setName("");
    history.push(docRef.id);
  };

  return (
    <>
      <header>
        <h1>⚛️🔥💬</h1>
        <h1>Rooms</h1>
        <SignOut />
      </header>
      <section>
        <main>
          <ul className="rooms-list">
            {rooms && rooms.map(({ id, name, createdBy }) => <li key={id}>
              <Link to={id} className="room-link">{name}</Link>
            </li>)}
          </ul>
        </main>
        <form className="message-form" onSubmit={addRoom}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Pick a name for your new chat room" />
          <button type="submit" disabled={!name}>+</button>
        </form>
      </section>
    </>
  );
}

function ChatRooms() {
  return <>
    <Route exact path="/" component={RoomSelector} />
    <Route path="/:roomId" component={ChatRoom} />
  </>;
}

function App() {
  const [user] = useAuthState(auth);

  return (
    <Router>
      <div className="App">
        {user ? <ChatRooms /> : <SignIn />}
      </div>
    </Router>
  );
}

export default App;
