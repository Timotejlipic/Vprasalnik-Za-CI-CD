import React from 'react';
import Assessment1 from './Assessment1.jsx';
import Assessment4 from './Assessment4.jsx';

export default function AssessmentWrapper(props) {
  const { viewType = 'collapsible' } = props;
  const AssessmentComponent = viewType === 'tabs' ? Assessment4 : Assessment1;
  return <AssessmentComponent {...props} />;
}
