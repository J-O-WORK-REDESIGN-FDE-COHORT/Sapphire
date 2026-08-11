import { gql } from '@apollo/client';
import { useSubscription } from '@apollo/client/react';
import { useEffect } from 'react';
import { Alert } from '@/services/notificationService';

const ALERT_SUBSCRIPTION = gql`
  subscription OnAlertReceived($userId: ID!) {
    alertReceived(userId: $userId) {
      userId
      deviceId
      windowStartTime
      windowEndTime
      totalSteps
      alertTimestamp
      alertMessage
    }
  }
`;

export function useAlertSubscription(userId: string | undefined, onAlert: (alert: Alert) => void) {
  console.log('🎣 useAlertSubscription hook called');
  console.log('  userId:', userId);
  console.log('  skip:', !userId);
  
  const { data, error, loading } = useSubscription(ALERT_SUBSCRIPTION, {
    variables: { userId },
    skip: !userId,
  });

  console.log('🔍 Subscription state:');
  console.log('  loading:', loading);
  console.log('  data:', data);
  console.log('  error:', error);

  useEffect(() => {
    console.log('📬 Data effect triggered');
    if (data && (data as any).alertReceived) {
      const alertData = (data as any).alertReceived;
      console.log('✅ Alert received from GraphQL subscription:', alertData);
      console.log('  userId:', alertData.userId);
      console.log('  alertMessage:', alertData.alertMessage);
      console.log('  totalSteps:', alertData.totalSteps);
      onAlert(alertData);
    } else {
      console.log('⏳ No alert data yet');
    }
  }, [data, onAlert]);

  useEffect(() => {
    if (error) {
      console.error('❌ GraphQL subscription error:', error);
      console.error('  Error message:', error.message);
      console.error('  Error stack:', error.stack);
      console.error('  Network error:', (error as any).networkError);
      console.error('  GraphQL errors:', (error as any).graphQLErrors);
    }
  }, [error]);

  return { error, loading };
}

// Made with Bob
