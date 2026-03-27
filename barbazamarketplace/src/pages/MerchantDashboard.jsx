import React from 'react';
import { Helmet } from 'react-helmet';
import MerchantLayout from '../components/MerchantLayout';

const MerchantDashboard = () => {
  return (
    <>
      <Helmet>
        <title>Merchant Portal - Barbaza MPC</title>
      </Helmet>
      <MerchantLayout />
    </>
  );
};

export default MerchantDashboard;

