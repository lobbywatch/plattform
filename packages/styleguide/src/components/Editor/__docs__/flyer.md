### Bugs

- Links: 
  - autolinking gets out of sync when the link is edited (onChange should also change text)
  - shorten link text? (like BE would)

```react
state: {
    value: [
      {
        type: 'flyerTileOpening',
        children: [
          {
            type: 'headline',
            children: [
              { text: 'Guten Morgen,' },
              { type: 'break', children: [{ text: '' }] },
              { text: 'schoen sind Sie da!' },
            ],
          },
          {
            type: 'flyerMetaP',
            children: [
              {
                text: 'And ',
              },
              {
                type: 'link',
                href: 'www.one.com',
                children: [{ text: 'one' }],
              },
              {
                text: ' and ',
              },
              {
                type: 'link',
                href: 'www.two.com',
                children: [{ text: 'two' }],
              },
              {
                text: ' little links.',
              },
            ],
          },
        ],
      },
      {
        type: 'flyerTileClosing',
        children: [
          {
            type: 'headline',
            children: [{ text: 'Bis nachher!' }],
          },
          {
            type: 'flyerSignature',
            children: [
              {
                text: 'Ihre Crew der Republik',
              },
            ],
          },
        ],
      },
    ],
    structure: [
        {
            type: 'flyerTileOpening',
        },
        {
            type: ['flyerTile', 'flyerTileMeta'],
            repeat: true
        },
        {
            type: 'flyerTileClosing',
        },
    ]
}
---
<Editor
    value={state.value}
    setValue={(newValue) => {
        setState({value: newValue})
    }}
    structure={state.structure}
    config={{ debug: true, schema, editorSchema, t }}
/>
```

## Rendering

```react
<SlateRender value={exampleTree} schema={schema} />
```
