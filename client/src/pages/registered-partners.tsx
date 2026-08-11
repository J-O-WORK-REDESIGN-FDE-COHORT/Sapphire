import { useState, useEffect } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { Search, Plus, CheckCircle, XCircle } from "lucide-react";
import Sidebar from "@/components/sidebar";
import NotificationBell from "@/components/notification-bell";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GET_PARTNERS, ONBOARD_PARTNER, GET_PARTNER_REVIEW, EXECUTE_REVIEW_ACTION } from "@/graphql/partners";
import { useToast } from "@/hooks/use-toast";
import { trackPage, trackEvent, AnalyticsEvents } from "@/lib/analytics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Partner {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  location?: string;
}

interface ReviewAction {
  buttonName: string;
  type: string;
  webhookURL: string;
}

interface PartnerReview {
  partnerId: string;
  review: ReviewAction[];
}

export default function RegisteredPartners() {
  const { user } = useAuth();
  const { alerts, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { toast } = useToast();

  // Track page view
  useEffect(() => {
    trackPage('Registered Partners', {
      userId: user?.email,
    });
    trackEvent(AnalyticsEvents.PARTNER_VIEWED, {
      userId: user?.email,
      timestamp: new Date().toISOString(),
    });
  }, [user?.email]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOnboardDialogOpen, setIsOnboardDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [reviewActions, setReviewActions] = useState<ReviewAction[]>([]);
  const [reviewNotes, setReviewNotes] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    partnerCode: "",
    name: "",
    description: "",
    type: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
  });

  const types = ["GYM", "LAB", "INSURER", "CORPORATE", "CLINIC", "PHARMACY"];

  const { loading, error, data } = useQuery(GET_PARTNERS, {
    variables: {
      searchQuery: searchQuery || null,
      type: null,
      location: null,
    },
  });

  const partners: Partner[] = (data as any)?.partners || [];

  const [onboardPartner, { loading: onboarding }] = useMutation(ONBOARD_PARTNER, {
    onCompleted: (data) => {
      toast({
        title: "Success",
        description: "Partner onboarded successfully!",
      });
      handleCloseDialogs();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to onboard partner",
        variant: "destructive",
      });
    },
    refetchQueries: [{ query: GET_PARTNERS, variables: { searchQuery: null, type: null, location: null } }],
  });

  const [getPartnerReview, { loading: loadingReview }] = useLazyQuery(GET_PARTNER_REVIEW);

  const [executeReviewAction, { loading: executingAction }] = useMutation(EXECUTE_REVIEW_ACTION, {
    onCompleted: (data: any) => {
      if (data?.executeReviewAction?.success) {
        toast({
          title: "Success",
          description: data.executeReviewAction.message || "Action executed successfully!",
        });
        handleCloseDialogs();
      } else {
        toast({
          title: "Error",
          description: data?.executeReviewAction?.message || "Failed to execute action",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to execute action",
        variant: "destructive",
      });
    },
    refetchQueries: [{ query: GET_PARTNERS, variables: { searchQuery: null, type: null, location: null } }],
  });

  const filteredPartners = partners.filter((partner) =>
    partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    partner.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (partner.location && partner.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenOnboardDialog = () => {
    setFormData({ partnerCode: "", name: "", description: "", type: "", city: "", state: "", country: "", postalCode: "" });
    setIsOnboardDialogOpen(true);
  };

  const handleCloseDialogs = () => {
    setIsOnboardDialogOpen(false);
    setIsReviewDialogOpen(false);
    setSelectedPartner(null);
    setReviewActions([]);
    setReviewNotes("");
    setFormData({ partnerCode: "", name: "", description: "", type: "", city: "", state: "", country: "", postalCode: "" });
  };

  const generatePartnerCode = (name: string): string => {
    return name.toUpperCase().replace(/\s+/g, '-') + '-00';
  };

  const handleSubmitOnboard = (e: React.FormEvent) => {
    e.preventDefault();
    const partnerCode = generatePartnerCode(formData.name);

    // Track partner onboarding
    trackEvent(AnalyticsEvents.PARTNER_ONBOARDED, {
      userId: user?.email,
      partnerName: formData.name,
      partnerType: formData.type,
      timestamp: new Date().toISOString(),
    });
    
    onboardPartner({
      variables: {
        input: {
          partnerCode,
          name: formData.name,
          partnerType: formData.type,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          postalCode: formData.postalCode,
        },
      },
    });
  };

  const handleOpenReviewDialog = async (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData({
      partnerCode: partner.id,
      name: partner.name,
      description: partner.description || "",
      type: partner.type,
      city: partner.city || "",
      state: partner.state || "",
      country: partner.country || "",
      postalCode: partner.postalCode || "",
    });
    
    // Fetch review actions for this partner
    try {
      const { data }: any = await getPartnerReview({
        variables: { partnerId: partner.id }
      });
      
      if (data?.getPartnerReview?.review) {
        setReviewActions(data.getPartnerReview.review);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch partner review",
        variant: "destructive",
      });
    }
    
    setIsReviewDialogOpen(true);
  };

  const handleReviewAction = (action: ReviewAction) => {
    if (!selectedPartner || !user?.email) return;
    
    // Parse the webhook URL to extract userId and notes from query params
    const url = new URL(action.webhookURL);
    const urlUserId = url.searchParams.get('userId') || user.email;
    
    // Use the notes from the textarea or the default from URL
    const notes = reviewNotes || action.type.charAt(0).toUpperCase() + action.type.slice(1);
    
    executeReviewAction({
      variables: {
        webhookUrl: action.webhookURL,
        userId: urlUserId,
        notes: notes,
      },
    });
  };

  const getNextStatus = (currentStatus: string): string => {
    const statusLower = currentStatus?.toLowerCase();
    
    // If already approved, show "Approved"
    if (statusLower === "approved") {
      return "Approved";
    }
    
    // If rejected, show "Rejected"
    if (statusLower === "rejected") {
      return "Rejected";
    }
    
    const statusFlow: { [key: string]: string } = {
      "draft": "Pending Review",
      "pending": "Under Review",
      "under review": "Approved",
      "active": "Active",
    };
    return statusFlow[statusLower] || "Approve";
  };

  const canApprove = (status: string): boolean => {
    const statusLower = status?.toLowerCase();
    // Cannot approve if already active, approved, or rejected
    return statusLower !== "active" && statusLower !== "approved" && statusLower !== "rejected";
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-8">
            <h1 className="text-xl font-semibold text-slate-900">Wellness Partners</h1>
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
            {/* Search and Action Bar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search partners..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleOpenOnboardDialog}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Onboard a Partner
              </Button>
            </div>

            {loading && (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">Loading partners...</p>
              </div>
            )}
            
            {error && (
              <div className="text-center py-12">
                <p className="text-red-600">Error: {error.message}</p>
              </div>
            )}
            
            {!loading && !error && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold text-slate-900">Partner Name</TableHead>
                      <TableHead className="font-semibold text-slate-900">Partner Type</TableHead>
                      <TableHead className="font-semibold text-slate-900">Partner Address</TableHead>
                      <TableHead className="font-semibold text-slate-900">Partner Status</TableHead>
                      <TableHead className="font-semibold text-slate-900 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-slate-600">
                          No partners found matching your criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPartners.map((partner) => (
                        <TableRow key={partner.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-900">{partner.name}</TableCell>
                          <TableCell className="text-slate-600">{partner.type}</TableCell>
                          <TableCell className="text-slate-600">
                            {partner.city && partner.state ? `${partner.city}, ${partner.state}` : partner.location}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(partner.status)}`}>
                              {partner.status || "Unknown"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReviewDialog(partner)}
                              disabled={!canApprove(partner.status)}
                              className="disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {getNextStatus(partner.status)}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Onboard Partner Dialog */}
      <Dialog open={isOnboardDialogOpen} onOpenChange={setIsOnboardDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Onboard a Partner</DialogTitle>
            <DialogDescription>
              Fill in the details to onboard a new wellness partner.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitOnboard}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Partner Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter partner name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Partner Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter partner description"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Partner Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select partner type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Enter state"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Enter country"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="Enter postal code"
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialogs} disabled={onboarding}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={onboarding}>
                {onboarding ? "Onboarding..." : "Onboard Partner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Partner Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Partner</DialogTitle>
            <DialogDescription>
              Review the partner details and approve or reject the submission.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="review-name">Partner Name</Label>
              <Input
                id="review-name"
                value={formData.name}
                readOnly
                disabled
                className="bg-slate-50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="review-description">Partner Description</Label>
              <Textarea
                id="review-description"
                value={formData.description}
                readOnly
                disabled
                className="bg-slate-50"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="review-type">Partner Type</Label>
              <Input
                id="review-type"
                value={formData.type}
                readOnly
                disabled
                className="bg-slate-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="review-city">City</Label>
                <Input
                  id="review-city"
                  value={formData.city}
                  readOnly
                  disabled
                  className="bg-slate-50"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="review-state">State</Label>
                <Input
                  id="review-state"
                  value={formData.state}
                  readOnly
                  disabled
                  className="bg-slate-50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="review-country">Country</Label>
                <Input
                  id="review-country"
                  value={formData.country}
                  readOnly
                  disabled
                  className="bg-slate-50"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="review-postalCode">Postal Code</Label>
                <Input
                  id="review-postalCode"
                  value={formData.postalCode}
                  readOnly
                  disabled
                  className="bg-slate-50"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="review-status">Current Status</Label>
              <Input
                id="review-status"
                value={selectedPartner?.status || ""}
                readOnly
                disabled
                className="bg-slate-50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="review-notes">Notes</Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter review notes (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {loadingReview ? (
              <div className="text-center py-2">
                <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              reviewActions.map((action) => (
                <Button
                  key={action.type}
                  type="button"
                  variant={action.type === "rejected" ? "outline" : "default"}
                  onClick={() => handleReviewAction(action)}
                  disabled={executingAction}
                  className={
                    action.type === "rejected"
                      ? "border-red-300 text-red-600 hover:bg-red-50"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }
                >
                  {action.type === "rejected" ? (
                    <XCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  {executingAction ? "Processing..." : action.buttonName}
                </Button>
              ))
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Made with Bob
