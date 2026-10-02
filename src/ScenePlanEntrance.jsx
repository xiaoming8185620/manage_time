import React from 'react';
import { Notebook } from '@phosphor-icons/react';
import './scene-plan.css';

// World-sized artwork and independently sized touch targets share a floor anchor.
export function ScenePlanEntrance({ disabled = false, onOpen }) {
  return <>
    <div className="world-plan-terminal" aria-hidden="true">
      <img src="/assets/plan-terminal-v1.png" alt="" draggable="false" />
      <strong>今日计划</strong>
    </div>
    <button className="scene-plan-hotspot" aria-label="打开今日计划" disabled={disabled} onClick={onOpen}>
      <span><Notebook size={16} />今日计划</span>
    </button>
  </>;
}
