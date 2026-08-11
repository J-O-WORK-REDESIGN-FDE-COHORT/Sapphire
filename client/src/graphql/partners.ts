import { gql } from '@apollo/client';

export const GET_PARTNERS = gql`
  query GetPartners($searchQuery: String, $type: String, $location: String) {
    partners(searchQuery: $searchQuery, type: $type, location: $location) {
      id
      name
      type
      city
      state
      country
      postalCode
      status
      description
    }
  }
`;

export const GET_PARTNER_SERVICES = gql`
  query GetPartnerServices {
    partnerServices {
      id
      name
      description
      partner {
        id
        name
      }
      category
      price
      currency
      billingCycle
      serviceType
      status
    }
  }
`;

export const ONBOARD_PARTNER = gql`
  mutation OnboardPartner($input: OnboardPartnerInput!) {
    onboardPartner(input: $input) {
      id
      name
      type
      status
      description
      city
      state
      country
      postalCode
    }
  }
`;

export const ONBOARD_PARTNER_SERVICE = gql`
  mutation OnboardPartnerService($input: OnboardPartnerServiceInput!) {
    onboardPartnerService(input: $input) {
      id
      name
      category
      serviceType
      price
      currency
      billingCycle
      status
    }
  }
`;

export const GET_PARTNER_REVIEW = gql`
  query GetPartnerReview($partnerId: ID!) {
    getPartnerReview(partnerId: $partnerId) {
      partnerId
      review {
        buttonName
        type
        webhookURL
      }
    }
  }
`;

export const GET_SERVICE_REVIEW = gql`
  query Review($serviceId: ID!) {
    getServiceReview(serviceId: $serviceId) {
      review {
        buttonName
        type
        webhookURL
      }
    }
  }
`;

export const EXECUTE_REVIEW_ACTION = gql`
  mutation ExecuteReviewAction($webhookUrl: String!, $userId: String!, $notes: String) {
    executeReviewAction(webhookURL: $webhookUrl, userId: $userId, notes: $notes) {
      message
      success
    }
  }
`;

export const GET_USER_SUBSCRIPTIONS = gql`
  query UserSubscriptions($email: String!) {
    userSubscriptions(email: $email) {
      isActive
      partnerServiceId
    }
  }
`;

export const SUBSCRIBE_TO_SERVICE = gql`
  mutation SubscribeToService($email: String!, $serviceId: ID!, $endDate: String!) {
    subscribeToService(email: $email, serviceId: $serviceId, endDate: $endDate) {
      id
      userId
      partnerServiceId
      associationContext {
        endDate
      }
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const UNSUBSCRIBE_FROM_SERVICE = gql`
  mutation UnsubscribeFromService($email: String!, $serviceId: ID!) {
    unsubscribeFromService(email: $email, serviceId: $serviceId) {
      message
      success
    }
  }
`;

export const GET_USER_PARTNER_SERVICES = gql`
  query Query($email: String!) {
    userPartnerServices(email: $email) {
      subscription {
        id
        userId
        partnerServiceId
        associationContext {
          endDate
        }
        isActive
        createdAt
        updatedAt
      }
      service {
        id
        name
        description
        partner {
          id
          name
          type
          city
          state
          country
          postalCode
          description
          status
        }
        category
        serviceType
        price
        currency
        billingCycle
        status
      }
    }
  }
`;

// Made with Bob