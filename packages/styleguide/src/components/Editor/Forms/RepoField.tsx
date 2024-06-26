import React from 'react'
import { useRenderContext } from '../Render/Context'
import Field from '../../Form/Field'
import IconButton from '../../IconButton'
import { AutoSlugLinkInfo } from './github'
import RepoSearch from './RepoSearch'
import { DeleteIcon } from '../../Icons'

const RepoField: React.FC<{
  href?: string
  onChange: ({ value: any }) => void
  onDelete: () => void
  template?: string
  label?: string
}> = ({ href, onChange, onDelete, template, label }) => {
  const { t } = useRenderContext()
  return href ? (
    <>
      <Field
        label={label || 'URL'}
        value={href}
        disabled
        icon={<IconButton Icon={DeleteIcon} onClick={onDelete} size={30} />}
      />
      <AutoSlugLinkInfo
        value={href || ''}
        label={t('metaData/field/href/document')}
      />
    </>
  ) : (
    <div style={{ marginBottom: 37 }}>
      <RepoSearch
        onChange={onChange}
        template={template}
        label={`${label} suchen`}
      />
    </div>
  )
}

export default RepoField
