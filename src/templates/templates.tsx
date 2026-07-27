import type { CSSProperties } from 'react'
import { getCardFontFamily, normalizeDesign } from '../brand/cardDesign'
import { appConfig } from '../config/appConfig'
import { richText } from '../engine/richtext'
import { AutoFit } from '../engine/useAutoFit'
import type { CardDesignSettings, CardPage, CardProps } from '../types'

type TemplateStyle = CSSProperties & {
  '--design-background': string
  '--design-text': string
}

const text = (page: CardPage, key: string) => String(page.content[key] ?? '')
const designFor = (page: CardPage) => normalizeDesign(page.design)
const horizontal = (value: CardDesignSettings['textAlign']) =>
  value === 'left' ? 'flex-start' : value === 'right' ? 'flex-end' : 'center'
const vertical = (value: CardDesignSettings['verticalAlign']) =>
  value === 'top' ? 'flex-start' : value === 'bottom' ? 'flex-end' : 'center'
const templateStyle = (design: CardDesignSettings): TemplateStyle => ({
  '--design-background': design.backgroundColor,
  '--design-text': design.textColor,
  backgroundColor: design.backgroundColor,
  backgroundImage: design.gradientEnabled
    ? `linear-gradient(180deg, transparent ${100 - design.gradientRange}%, rgb(0 0 0 / ${design.gradientStrength}%) 100%)`
    : undefined,
  color: design.textColor,
  fontFamily: getCardFontFamily(design.fontId, design.englishFontId),
})
const copyStyle = (design: CardDesignSettings): CSSProperties => ({
  fontFamily: 'inherit',
  letterSpacing: `${design.letterSpacing / 100}em`,
  lineHeight: design.lineHeight,
})
const Footer = ({ page, pageIndex, pageCount }: CardProps) => {
  const design = designFor(page)
  return (
    <footer className={`card-footer ${design.showPageNumber ? '' : 'centered'}`}>
      <span>{appConfig.accountLabel}</span>
      {design.showPageNumber && <span>{String(pageIndex + 1).padStart(2, '0')} / {String(pageCount).padStart(2, '0')}</span>}
    </footer>
  )
}

export function CoverHook(props: CardProps) {
  const design = designFor(props.page)
  const width = `${design.contentWidth}%`
  return (
    <div
      className="template cover"
      style={{
        ...templateStyle(design),
        alignItems: horizontal(design.textAlign),
        justifyContent: vertical(design.verticalAlign),
        textAlign: design.textAlign,
      }}
    >
      <div className="eyebrow" style={{ width }}>{text(props.page, 'kicker')}</div>
      <AutoFit as="h1" max={design.fontSize} min={42} style={{ ...copyStyle(design), width }}>{richText(text(props.page, 'title'))}</AutoFit>
      <p style={{ ...copyStyle(design), width, maxWidth: width, fontSize: design.secondaryFontSize }}>{text(props.page, 'subtitle')}</p>
      <Footer {...props}/>
    </div>
  )
}

export function MidnightQuote(props: CardProps) {
  const design = designFor(props.page)
  const bodyStyle: CSSProperties = {
    ...copyStyle(design),
    alignItems: vertical(design.verticalAlign),
    justifyContent: horizontal(design.textAlign),
    textAlign: design.textAlign,
  }
  return (
    <div className="template midnight" style={templateStyle(design)}>
      <div className="kicker">{text(props.page, 'kicker')}</div>
      <span className="quote open">“</span>
      <AutoFit as="blockquote" max={design.fontSize} min={40} style={{ ...bodyStyle, fontWeight: 400 }}>
        <span style={{ width: `${design.contentWidth}%` }}>{richText(text(props.page, 'body'))}</span>
      </AutoFit>
      <span className="quote close">”</span>
      <div className="source">{text(props.page, 'source')}</div>
      <div className="note">{text(props.page, 'note')}</div>
      <Footer {...props}/>
    </div>
  )
}

export function QuoteBasic(props: CardProps) {
  const design = designFor(props.page)
  const width = `${design.contentWidth}%`
  return (
    <div className="template quote-basic" style={{ ...templateStyle(design), textAlign: design.textAlign }}>
      <span className="accent-line"/>
      <AutoFit as="blockquote" max={design.fontSize} min={38} style={{ ...copyStyle(design), width }}>
        {richText(text(props.page, 'quote'))}
      </AutoFit>
      <h3 style={{ width }}>{text(props.page, 'source')}</h3>
      <p style={{ ...copyStyle(design), width, fontSize: design.secondaryFontSize }}>{text(props.page, 'description')}</p>
      <Footer {...props}/>
    </div>
  )
}

export function ListInsight(props: CardProps) {
  const design = designFor(props.page)
  const items = Array.isArray(props.page.content.items) ? props.page.content.items : []
  return (
    <div className="template list" style={templateStyle(design)}>
      <div className="eyebrow">INSIGHT</div>
      <AutoFit as="h1" max={design.fontSize} min={40} style={copyStyle(design)}>{richText(text(props.page, 'title'))}</AutoFit>
      <ol style={{ gap: design.spacing }}>
        {items.map((item, index) => (
          <li key={index} style={{ ...copyStyle(design), fontSize: design.secondaryFontSize }}>
            <b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span>
          </li>
        ))}
      </ol>
      <p>{text(props.page, 'closing')}</p>
      <Footer {...props}/>
    </div>
  )
}

export function StatHighlight(props: CardProps) {
  const design = designFor(props.page)
  const width = `${design.contentWidth}%`
  return (
    <div
      className="template stat-highlight"
      style={{
        ...templateStyle(design),
        alignItems: horizontal(design.textAlign),
        justifyContent: vertical(design.verticalAlign),
        textAlign: design.textAlign,
      }}
    >
      <div className="eyebrow" style={{ width }}>{text(props.page, 'kicker')}</div>
      <div className="stat-value" style={{ justifyContent: horizontal(design.textAlign), width }}>
        <AutoFit as="strong" max={design.fontSize} min={100} style={copyStyle(design)}>{text(props.page, 'value')}</AutoFit>
        <span>{text(props.page, 'unit')}</span>
      </div>
      <AutoFit as="h1" max={design.secondaryFontSize} min={36} style={{ ...copyStyle(design), width }}>
        {richText(text(props.page, 'title'))}
      </AutoFit>
      <p style={{ width }}>{text(props.page, 'description')}</p>
      <Footer {...props}/>
    </div>
  )
}

export function ProcessSteps(props: CardProps) {
  const design = designFor(props.page)
  const items = Array.isArray(props.page.content.items) ? props.page.content.items : []
  return (
    <div className="template process-steps" style={templateStyle(design)}>
      <div className="eyebrow">{text(props.page, 'kicker')}</div>
      <AutoFit as="h1" max={design.fontSize} min={40} style={copyStyle(design)}>{richText(text(props.page, 'title'))}</AutoFit>
      <ol>
        {items.map((item, index) => (
          <li key={index} style={{ ...copyStyle(design), minHeight: design.spacing, fontSize: design.secondaryFontSize }}>
            <b>{String(index + 1).padStart(2, '0')}</b><span>{item}</span>
          </li>
        ))}
      </ol>
      <p>{text(props.page, 'closing')}</p>
      <Footer {...props}/>
    </div>
  )
}

export function Comparison(props: CardProps) {
  const design = designFor(props.page)
  const leftItems = Array.isArray(props.page.content.leftItems) ? props.page.content.leftItems : []
  const rightItems = Array.isArray(props.page.content.rightItems) ? props.page.content.rightItems : []
  return (
    <div className="template comparison" style={templateStyle(design)}>
      <div className="eyebrow">{text(props.page, 'kicker')}</div>
      <AutoFit as="h1" max={design.fontSize} min={38} style={copyStyle(design)}>{richText(text(props.page, 'title'))}</AutoFit>
      <div className="comparison-grid" style={{ gridTemplateColumns: `${design.layoutRatio}fr ${100 - design.layoutRatio}fr` }}>
        <section>
          <h2>{text(props.page, 'leftTitle')}</h2>
          <ul>{leftItems.map((item, index) => <li key={index} style={{ ...copyStyle(design), fontSize: design.secondaryFontSize }}>{item}</li>)}</ul>
        </section>
        <section>
          <h2>{text(props.page, 'rightTitle')}</h2>
          <ul>{rightItems.map((item, index) => <li key={index} style={{ ...copyStyle(design), fontSize: design.secondaryFontSize }}>{item}</li>)}</ul>
        </section>
      </div>
      <p>{text(props.page, 'conclusion')}</p>
      <Footer {...props}/>
    </div>
  )
}

export function QuoteCommentary(props: CardProps) {
  const design = designFor(props.page)
  return (
    <div className="template commentary" style={templateStyle(design)}>
      <AutoFit
        className="quote-box"
        max={design.fontSize}
        min={34}
        style={{ ...copyStyle(design), height: `${design.layoutRatio}%`, textAlign: design.textAlign }}
      >
        <span>“ {richText(text(props.page, 'quote'))} ”</span>
      </AutoFit>
      <div className="commentary-body">
        <div className="eyebrow">COMMENTARY</div>
        <p style={{ ...copyStyle(design), fontSize: design.secondaryFontSize }}>{text(props.page, 'commentary')}</p>
        <b>{text(props.page, 'source')}</b>
      </div>
      <Footer {...props}/>
    </div>
  )
}

export function ImageText(props: CardProps) {
  const design = designFor(props.page)
  return (
    <div className="template image-text" style={templateStyle(design)}>
      <div className="hero-image" style={{ height: `${design.layoutRatio}%` }}>
        {props.page.image ? <img src={props.page.image} alt="카드 배경"/> : <div className="image-placeholder">IMAGE</div>}
      </div>
      <div className="image-copy">
        <AutoFit as="h1" max={design.fontSize} min={38} style={copyStyle(design)}>{richText(text(props.page, 'title'))}</AutoFit>
        <p style={{ ...copyStyle(design), fontSize: design.secondaryFontSize }}>{text(props.page, 'body')}</p>
        <small>{text(props.page, 'caption')}</small>
      </div>
      <Footer {...props}/>
    </div>
  )
}

export function DividerClosing(props: CardProps) {
  const design = designFor(props.page)
  const width = `${design.contentWidth}%`
  return (
    <div
      className="template divider"
      style={{
        ...templateStyle(design),
        alignItems: horizontal(design.textAlign),
        justifyContent: vertical(design.verticalAlign),
        textAlign: design.textAlign,
      }}
    >
      <div className="eyebrow" style={{ width }}>{text(props.page, 'kicker')}</div>
      <div className="divider-rule"/>
      <AutoFit as="h1" max={design.fontSize} min={40} style={{ ...copyStyle(design), width }}>
        {richText(text(props.page, 'title'))}
      </AutoFit>
      <p style={{ ...copyStyle(design), width, fontSize: design.secondaryFontSize }}>{text(props.page, 'cta')}</p>
      <Footer {...props}/>
    </div>
  )
}
