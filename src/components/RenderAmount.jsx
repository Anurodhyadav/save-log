export const RenderAmount = ({ amount, parentCss = false }) => {
    const fmtNum = (n) => Math.abs(Math.round(n || 0)).toLocaleString('en-IN');
    return (
        <span className={parentCss & "lft-num font-mono text-xs md:text-sm font-semibold"}>
            Rs:<span style={{ paddingLeft: '3px' }}>{fmtNum(amount)}</span>
        </span>
    )
}