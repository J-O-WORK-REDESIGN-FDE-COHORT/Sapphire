import { User, Mail, MapPin, Crown, Ruler, Weight, Users, Heart, Activity } from "lucide-react";
import Sidebar from "@/components/sidebar";
import NotificationBell from "@/components/notification-bell";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useQuery, useMutation } from "@apollo/client/react";
import { ACTIVITY_SUMMARY, LATEST_WELLNESS_SUMMARY, UPGRADE_USER_TO_PREMIUM } from "@/graphql/auth";
import { useState, useEffect } from "react";
import { trackPage, trackEvent, AnalyticsEvents } from "@/lib/analytics";

interface Address {
  city: string;
  state: string;
  country: string;
  zip: string;
}

interface PhysicalAttributes {
  gender: string;
  heightCm: number;
  weightKg: number;
}

interface FetchUserData {
  name: string;
  email: string;
  address: Address;
  physicalAttributes: PhysicalAttributes;
  userTier: string;
}

interface WellnessSummary {
  id: string;
  userId: string;
  profileSummary: string;
  dataSummary: string;
  createdAt: string;
  updatedAt: string;
}

interface ActivitySummaryData {
  fetchUser: FetchUserData;
}

interface WellnessSummaryData {
  latestWellnessSummary: WellnessSummary | null;
}

export default function UserProfile() {
  const { user } = useAuth();
  const { alerts, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [upgrading, setUpgrading] = useState(false);

  // Track page view
  useEffect(() => {
    trackPage('User Profile', {
      userId: user?.email,
    });
    trackEvent(AnalyticsEvents.PROFILE_VIEWED, {
      userId: user?.email,
      timestamp: new Date().toISOString(),
    });
  }, [user?.email]);

  // Fetch user profile data
  const { data, loading, error, refetch } = useQuery<ActivitySummaryData>(ACTIVITY_SUMMARY, {
    variables: { email: user?.email },
    skip: !user?.email,
  });

  // Fetch wellness summary data
  const { data: wellnessData, loading: wellnessLoading, error: wellnessError } = useQuery<WellnessSummaryData>(
    LATEST_WELLNESS_SUMMARY,
    {
      variables: { email: user?.email },
      skip: !user?.email,
    }
  );

  // Upgrade to premium mutation
  const [upgradeToPremium] = useMutation(UPGRADE_USER_TO_PREMIUM, {
    onCompleted: (data) => {
      console.log('Upgrade successful:', data);
      setUpgrading(false);
      // Refetch user data to update the UI
      refetch();
    },
    onError: (error) => {
      console.error('Upgrade failed:', error);
      setUpgrading(false);
      alert('Failed to upgrade to premium. Please try again.');
    },
  });

  const handleUpgrade = async () => {
    if (!user?.email) return;
    
    setUpgrading(true);
    try {
      await upgradeToPremium({
        variables: { email: user.email },
      });
    } catch (error) {
      console.error('Error upgrading:', error);
      setUpgrading(false);
    }
  };

  const profileData = data?.fetchUser;
  const wellnessSummary = wellnessData?.latestWellnessSummary;

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-8">
            <h1 className="text-xl font-semibold text-slate-900">User Profile</h1>
            <NotificationBell
              alerts={alerts}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
            />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                
                <div className="px-8 pb-8">
                  <div className="flex flex-col items-center -mt-16 mb-8">
                    <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center mb-4">
                      <span className="text-4xl font-bold text-blue-600">
                        {profileData?.name ? profileData.name.split(' ').map((n: string) => n[0]).join('') : (user?.given_name?.[0] || '') + (user?.family_name?.[0] || '')}
                      </span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold text-slate-900">
                          {profileData?.name || `${user?.given_name || ''} ${user?.family_name || ''}`}
                        </h2>
                        {profileData?.userTier === 'premium' && (
                          <Crown className="w-6 h-6 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-slate-600">
                        {profileData?.userTier === 'premium' ? 'Premium Member' : 'Free Member'}
                      </p>
                    </div>
                  </div>

                  {loading && (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-slate-600">Loading profile data...</p>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <p className="text-red-800 text-sm">Failed to load profile data. Showing basic information.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Personal Information</h3>
                      
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Full Name</p>
                          <p className="text-sm font-medium text-slate-900">
                            {profileData?.name || `${user?.given_name || ''} ${user?.family_name || ''}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Mail className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Email</p>
                          <p className="text-sm font-medium text-slate-900">{profileData?.email || user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Details</h3>
                      
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <Crown className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Membership Type</p>
                          <p className="text-sm font-medium text-slate-900 capitalize">
                            {profileData?.userTier || 'Free'}
                          </p>
                        </div>
                      </div>

                      {profileData?.userTier === 'premium' && (
                        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Crown className="w-5 h-5 text-yellow-600" />
                            <h4 className="font-semibold text-yellow-900">Premium Benefits</h4>
                          </div>
                          <ul className="space-y-1 text-sm text-yellow-800">
                            <li>• AI Wellness Coach Access</li>
                            <li>• Priority Support</li>
                            <li>• Advanced Analytics</li>
                            <li>• Unlimited Partner Services</li>
                          </ul>
                        </div>
                      )}

                      {profileData?.userTier !== 'premium' && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Crown className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold text-blue-900">Upgrade to Premium</h4>
                          </div>
                          <ul className="space-y-1 text-sm text-blue-800 mb-4">
                            <li>• AI Wellness Coach Access</li>
                            <li>• Priority Support</li>
                            <li>• Advanced Analytics</li>
                            <li>• Unlimited Partner Services</li>
                          </ul>
                          <button
                            onClick={handleUpgrade}
                            disabled={upgrading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {upgrading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Upgrading...</span>
                              </>
                            ) : (
                              <>
                                <Crown className="w-4 h-4" />
                                <span>Upgrade to Premium</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Physical Attributes Section */}
                  {profileData?.physicalAttributes && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Physical Attributes</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Gender</p>
                            <p className="text-sm font-medium text-slate-900 capitalize">
                              {profileData.physicalAttributes.gender}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                            <Ruler className="w-5 h-5 text-cyan-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Height</p>
                            <p className="text-sm font-medium text-slate-900">
                              {profileData.physicalAttributes.heightCm} cm
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Weight className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Weight</p>
                            <p className="text-sm font-medium text-slate-900">
                              {profileData.physicalAttributes.weightKg} kg
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Address Section */}
                  {profileData?.address && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Address</h3>
                      <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-rose-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Location</p>
                          <p className="text-sm font-medium text-slate-900">
                            {profileData.address.city}, {profileData.address.state}
                          </p>
                          <p className="text-sm text-slate-600">
                            {profileData.address.country} - {profileData.address.zip}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wellness Summary Section */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Wellness Summary</h3>
                    
                    {wellnessLoading && (
                      <div className="bg-slate-50 rounded-lg p-6 text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-sm text-slate-600">Loading wellness summary...</p>
                      </div>
                    )}

                    {wellnessError && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-amber-800 text-sm">Wellness summary not available at this time.</p>
                      </div>
                    )}

                    {!wellnessLoading && !wellnessError && wellnessSummary && (
                      <div className="space-y-4">
                        {/* Profile Summary Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Heart className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-blue-900 mb-1">Profile Overview</h4>
                              <p className="text-sm text-blue-800 leading-relaxed">
                                {wellnessSummary.profileSummary}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Data Summary Card */}
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-5 border border-emerald-200">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Activity className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-emerald-900 mb-1">Health Insights</h4>
                              <p className="text-sm text-emerald-800 leading-relaxed">
                                {wellnessSummary.dataSummary}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Last Updated */}
                        <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
                          <span>Last updated:</span>
                          <span className="font-medium">
                            {new Date(wellnessSummary.updatedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    )}

                    {!wellnessLoading && !wellnessError && !wellnessSummary && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                        <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-600 text-sm">No wellness summary available yet.</p>
                        <p className="text-slate-500 text-xs mt-1">Your wellness summary will appear here once generated.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Made with Bob
