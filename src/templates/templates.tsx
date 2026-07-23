import type { CSSProperties } from 'react'
import { appConfig } from '../config/appConfig'
import { fontFamilies, normalizeDesign } from '../brand/midnightDesign'
import { richText } from '../engine/richtext'
import { AutoFit } from '../engine/useAutoFit'
import type { CardProps } from '../types'

const text = (page: CardProps['page'], key: string) => String(page.content[key] ?? '')
const Footer = ({ page, pageIndex, pageCount }: CardProps) => {
  const design = normalizeDesign(page.design)
  return <footer className={`card-footer ${design.showPageNumber ? '' : 'centered'}`}><span>{appConfig.accountLabel}</span>{design.showPageNumber && <span>{String(pageIndex + 1).padStart(2, '0')} / {String(pageCount).padStart(2, '0')}</span>}</footer>
}
export function CoverHook(props: CardProps) { return <div className="template cover"><div className="eyebrow">{text(props.page, 'kicker')}</div><AutoFit as="h1" max={92} min={54}>{richText(text(props.page, 'title'))}</AutoFit><p>{text(props.page, 'subtitle')}</p><Footer {...props}/></div> }
export function MidnightQuote(props: CardProps) {
  const d = normalizeDesign(props.page.design)
  const bodyStyle: CSSProperties = {
    alignItems: d.verticalAlign === 'top' ? 'flex-start' : d.verticalAlign === 'bottom' ? 'flex-end' : 'center',
    justifyContent: d.textAlign === 'left' ? 'flex-start' : d.textAlign === 'right' ? 'flex-end' : 'center',
    textAlign: d.textAlign,
    lineHeight: d.lineHeight,
  }
  return <div className="template midnight" style={{ backgroundColor: d.backgroundColor, color: d.textColor, fontFamily: fontFamilies[d.fontId] }}>
    <div className="kicker">{text(props.page, 'kicker')}</div><span className="quote open">“</span>
    <AutoFit as="blockquote" max={d.fontSize} min={40} style={{ ...bodyStyle, letterSpacing: `${d.letterSpacing / 100}em`, fontWeight: d.fontId === 'kopub-batang-bold' ? 700 : 400 }}><span style={{width:`${d.contentWidth}%`}}>{richText(text(props.page, 'body'))}</span></AutoFit>
    <span className="quote close">”</span><div className="source">{text(props.page, 'source')}</div><div className="note">{text(props.page, 'note')}</div><Footer {...props}/>
  </div>
}
export function QuoteBasic(props: CardProps) { return <div className="template quote-basic"><span className="accent-line"/><AutoFit as="blockquote" max={68} min={44}>{richText(text(props.page, 'quote'))}</AutoFit><h3>{text(props.page, 'source')}</h3><p>{text(props.page, 'description')}</p><Footer {...props}/></div> }
export function ListInsight(props: CardProps) { const items = Array.isArray(props.page.content.items) ? props.page.content.items : []; return <div className="template list"><div className="eyebrow">INSIGHT</div><AutoFit as="h1" max={64} min={48}>{richText(text(props.page, 'title'))}</AutoFit><ol>{items.map((item, i) => <li key={i}><b>{String(i + 1).padStart(2, '0')}</b><span>{item}</span></li>)}</ol><p>{text(props.page, 'closing')}</p><Footer {...props}/></div> }
export function StatHighlight(props: CardProps) { return <div className="template stat-highlight"><div className="eyebrow">{text(props.page, 'kicker')}</div><div className="stat-value"><AutoFit as="strong" max={230} min={120}>{text(props.page, 'value')}</AutoFit><span>{text(props.page, 'unit')}</span></div><AutoFit as="h1" max={58} min={42}>{richText(text(props.page, 'title'))}</AutoFit><p>{text(props.page, 'description')}</p><Footer {...props}/></div> }
export function ProcessSteps(props: CardProps) { const items = Array.isArray(props.page.content.items) ? props.page.content.items : []; return <div className="template process-steps"><div className="eyebrow">{text(props.page, 'kicker')}</div><AutoFit as="h1" max={64} min={46}>{richText(text(props.page, 'title'))}</AutoFit><ol>{items.map((item, i) => <li key={i}><b>{String(i + 1).padStart(2, '0')}</b><span>{item}</span></li>)}</ol><p>{text(props.page, 'closing')}</p><Footer {...props}/></div> }
export function Comparison(props: CardProps) { const leftItems = Array.isArray(props.page.content.leftItems) ? props.page.content.leftItems : []; const rightItems = Array.isArray(props.page.content.rightItems) ? props.page.content.rightItems : []; return <div className="template comparison"><div className="eyebrow">{text(props.page, 'kicker')}</div><AutoFit as="h1" max={62} min={44}>{richText(text(props.page, 'title'))}</AutoFit><div className="comparison-grid"><section><h2>{text(props.page, 'leftTitle')}</h2><ul>{leftItems.map((item, i) => <li key={i}>{item}</li>)}</ul></section><section><h2>{text(props.page, 'rightTitle')}</h2><ul>{rightItems.map((item, i) => <li key={i}>{item}</li>)}</ul></section></div><p>{text(props.page, 'conclusion')}</p><Footer {...props}/></div> }
export function QuoteCommentary(props: CardProps) { return <div className="template commentary"><AutoFit className="quote-box" max={54} min={40}><span>“ {richText(text(props.page, 'quote'))} ”</span></AutoFit><div className="commentary-body"><div className="eyebrow">COMMENTARY</div><p>{text(props.page, 'commentary')}</p><b>{text(props.page, 'source')}</b></div><Footer {...props}/></div> }
export function ImageText(props: CardProps) { return <div className="template image-text"><div className="hero-image">{props.page.image ? <img src={props.page.image} alt="카드 배경"/> : <div className="image-placeholder">IMAGE</div>}</div><div className="image-copy"><AutoFit as="h1" max={58} min={44}>{richText(text(props.page, 'title'))}</AutoFit><p>{text(props.page, 'body')}</p><small>{text(props.page, 'caption')}</small></div><Footer {...props}/></div> }
export function DividerClosing(props: CardProps) { return <div className="template divider"><div className="eyebrow">{text(props.page, 'kicker')}</div><div className="divider-rule"/><AutoFit as="h1" max={76} min={48}>{richText(text(props.page, 'title'))}</AutoFit><p>{text(props.page, 'cta')}</p><Footer {...props}/></div> }
