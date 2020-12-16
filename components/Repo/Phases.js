import React from 'react'
import { css, merge } from 'glamor'
import { Link } from '../../lib/routes'
import { withRouter } from 'next/router'
import { fontStyles } from '@project-r/styleguide'

const styles = {
  phase: css({
    color: '#fff',
    padding: '5px 10px',
    display: 'inline-block',
    ...fontStyles.sansSerifRegular14,
    letterSpacing: 0.5
  }),
  phaseLarge: css({
    margin: '0 6px 6px 0',
    ...fontStyles.sansSerifRegular16
  })
}

export const Phase = ({
  phase,
  onClick,
  disabled,
  discrete,
  isActive,
  large
}) => (
  <div
    {...merge(styles.phase, large && styles.phaseLarge)}
    style={{
      backgroundColor: disabled ? 'gray' : phase.color,
      cursor: onClick ? 'pointer' : 'default',
      opacity: discrete || (phase.count === 0 && !isActive) ? 0.5 : 1
    }}
    onClick={onClick}
  >
    {phase.label} {phase.count ? `(${phase.count})` : ''}
  </div>
)

const PhaseFilter = withRouter(
  ({
    phases,
    router: {
      query,
      query: { phase }
    }
  }) => (
    <div {...styles.filterBar}>
      {phases.map(p => {
        const isActive = phase && phase === p.key

        return (
          <Link
            key={p.key}
            route='index'
            replace
            scroll={false}
            params={{ ...query, phase: isActive ? null : p.key }}
          >
            <Phase
              phase={p}
              disabled={phase && !isActive}
              isActive={isActive}
              large
            />
          </Link>
        )
      })}
    </div>
  )
)

export default PhaseFilter
