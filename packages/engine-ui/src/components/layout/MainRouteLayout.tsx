import React from 'react'
import { Link } from 'react-router-dom'
import Elements from '../../shared-elements'
import Icons from '../../assets/Icons'
import styled from 'styled-components'

const NestedMenuWrapper = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
`
const MainRouteLayout: React.FC<{
  onClickHandler?: () => void
  redirect: string
}> = ({ children, onClickHandler, redirect = '/' }) => {
  return (
    <NestedMenuWrapper>
      <Elements.Layout.FlexRowWrapper style={{ margin: '1.2em 0' }}>
        <Link to={redirect} onClick={() => onClickHandler?.()}>
          <Icons.Arrow style={{ transform: 'rotate(90deg)' }} />
        </Link>
      </Elements.Layout.FlexRowWrapper>
      {children}
    </NestedMenuWrapper>
  )
}
export default MainRouteLayout