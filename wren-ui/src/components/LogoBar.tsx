import styled from 'styled-components';

const Logo = styled.img`
  display: block;
  width: 125px;
  height: 30px;
  object-fit: contain;
  flex-shrink: 0;
`;

export default function LogoBar() {
  return (
    <Logo
      src="/images/logo-white-with-text.svg"
      alt="Wren AI"
      width={125}
      height={30}
      loading="eager"
      decoding="async"
      suppressHydrationWarning
    />
  );
}
