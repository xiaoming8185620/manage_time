import React,{useReducer} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../../src/App';
import {initialState,gameReducer} from '../../src/game';
import '../../src/styles.css';
// Visual-only fixture: no localStorage save and no household write endpoint.
function Fixture(){const [state,dispatch]=useReducer(gameReducer,{...initialState(),greeted:true,coins:20});return <App cloud={{state,dispatch,paused:false}}/>;}
createRoot(document.getElementById('root')).render(<Fixture/>);
