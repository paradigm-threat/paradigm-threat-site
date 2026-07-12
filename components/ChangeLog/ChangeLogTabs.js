'use client'

import React from 'react'
import styles from './ChangeLog.module.css'

export const CHANGELOG_TABS = [
  { id: 'articles', label: 'Articles' },
  { id: 'investigations', label: 'Investigations' },
  { id: 'blog', label: 'Blog' },
  { id: 'changelog', label: 'Recent' },
]

export default function ChangeLogTabs ({ activeTab, onTabChange }) {
  return (
    <div
      className={styles.tabBar}
      role="tablist"
      aria-label="Recent content sections"
    >
      {CHANGELOG_TABS.map((tab) => {
        const selected = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`changelog-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`changelog-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={`${styles.tabBtn}${selected ? ` ${styles.tabBtnActive}` : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
