// GraphQL query for Find a Partner feature — SCRUM-26 / SCRUM-27
import { gql } from "@apollo/client";

export const FIND_PARTNERS = gql`
  query FindPartners($query: PartnerSearchInput!) {
    findPartners(query: $query) {
      keywordResults {
        id
        name
        description
        category
        partnerName
      }
      semanticResults {
        id
        name
        description
        category
        partnerName
      }
      totalKeywordResults
      totalSemanticResults
    }
  }
`;
