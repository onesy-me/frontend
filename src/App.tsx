import React, { Suspense, lazy } from 'react';
import ImageExample from 'assets/images/background.jpg';
import IconExample from 'assets/svg/logo.svg';

import { style } from '@onesy/style-react';
import { Line, Reset } from '@onesy/ui-react';

const useStyle = style(theme => ({
  root: {
    background: theme.palette.background.quaternary.tertiary
  }
}), { name: 'App' });

const LazyComponent = lazy(() => import('./LazyComponent'));

const App: React.FC = () => {
  const { classes } = useStyle();

  return (
    <Line
      flex

      className={classes.root}
    >
      <Reset />

      <h1>Hello, React with TypeScript! asd qwe1234</h1>

      {/* Image Import Example */}
      <img src={ImageExample} alt='Example asd' width='200' />

      {/* SVG Import as a React Component */}
      <IconExample width={50} height={50} fill='blue' />

      {/* Lazy-Loaded Component */}
      <Suspense fallback={<p>Loading...</p>}>
        <LazyComponent />
      </Suspense>
    </Line>
  );
};

export default App;
