package types

// https://api.pullpush.io/reddit/submission/search?html_decode=True&subreddit=caliebre&since=1738350600&until=1738869000&size=100
// nolint: tagliatelle
type PullPullRedditSubmission struct {
	Data []struct {
		ApprovedAtUtc     interface{} `json:"approved_at_utc"`
		Subreddit         string      `json:"subreddit"`
		Selftext          string      `json:"selftext"`
		AuthorFullname    string      `json:"author_fullname"`
		Saved             bool        `json:"saved"`
		ModReasonTitle    interface{} `json:"mod_reason_title"`
		Gilded            float64     `json:"gilded"`
		Clicked           bool        `json:"clicked"`
		Title             string      `json:"title"`
		LinkFlairRichtext []struct {
			A string `json:"a,omitempty"`
			E string `json:"e"`
			U string `json:"u,omitempty"`
			T string `json:"t,omitempty"`
		} `json:"link_flair_richtext"`
		SubredditNamePrefixed      string        `json:"subreddit_name_prefixed"`
		Hidden                     bool          `json:"hidden"`
		Pwls                       float64       `json:"pwls"`
		LinkFlairCSSClass          string        `json:"link_flair_css_class"`
		Downs                      float64       `json:"downs"`
		ThumbnailHeight            interface{}   `json:"thumbnail_height"`
		TopAwardedType             interface{}   `json:"top_awarded_type"`
		HideScore                  bool          `json:"hide_score"`
		Name                       string        `json:"name"`
		Quarantine                 bool          `json:"quarantine"`
		LinkFlairTextColor         string        `json:"link_flair_text_color"`
		UpvoteRatio                float64       `json:"upvote_ratio"`
		AuthorFlairBackgroundColor interface{}   `json:"author_flair_background_color"`
		SubredditType              string        `json:"subreddit_type"`
		Ups                        float64       `json:"ups"`
		TotalAwardsReceived        float64       `json:"total_awards_received"`
		MediaEmbed                 struct{}      `json:"media_embed"`
		ThumbnailWidth             interface{}   `json:"thumbnail_width"`
		AuthorFlairTemplateID      interface{}   `json:"author_flair_template_id"`
		IsOriginalContent          bool          `json:"is_original_content"`
		UserReports                []interface{} `json:"user_reports"`
		SecureMedia                interface{}   `json:"secure_media"`
		IsRedditMediaDomain        bool          `json:"is_reddit_media_domain"`
		IsMeta                     bool          `json:"is_meta"`
		Category                   interface{}   `json:"category"`
		SecureMediaEmbed           struct{}      `json:"secure_media_embed"`
		LinkFlairText              string        `json:"link_flair_text"`
		CanModPost                 bool          `json:"can_mod_post"`
		Score                      float64       `json:"score"`
		ApprovedBy                 interface{}   `json:"approved_by"`
		IsCreatedFromAdsUI         bool          `json:"is_created_from_ads_ui"`
		AuthorPremium              bool          `json:"author_premium"`
		Thumbnail                  string        `json:"thumbnail"`
		Edited                     bool          `json:"edited"`
		AuthorFlairCSSClass        interface{}   `json:"author_flair_css_class"`
		AuthorFlairRichtext        []interface{} `json:"author_flair_richtext"`
		Gildings                   struct{}      `json:"gildings"`
		PostHint                   string        `json:"post_hint"`
		ContentCategories          interface{}   `json:"content_categories"`
		IsSelf                     bool          `json:"is_self"`
		ModNote                    interface{}   `json:"mod_note"`
		Created                    float64       `json:"created"`
		LinkFlairType              string        `json:"link_flair_type"`
		Wls                        float64       `json:"wls"`
		RemovedByCategory          string        `json:"removed_by_category"`
		BannedBy                   interface{}   `json:"banned_by"`
		AuthorFlairType            string        `json:"author_flair_type"`
		Domain                     string        `json:"domain"`
		AllowLiveComments          bool          `json:"allow_live_comments"`
		SelftextHTML               string        `json:"selftext_html"`
		Likes                      interface{}   `json:"likes"`
		SuggestedSort              interface{}   `json:"suggested_sort"`
		BannedAtUtc                interface{}   `json:"banned_at_utc"`
		ViewCount                  interface{}   `json:"view_count"`
		Archived                   bool          `json:"archived"`
		NoFollow                   bool          `json:"no_follow"`
		IsCrosspostable            bool          `json:"is_crosspostable"`
		Pinned                     bool          `json:"pinned"`
		Over18                     bool          `json:"over_18"`
		Preview                    struct {
			Images []struct {
				Source struct {
					URL    string  `json:"url"`
					Width  float64 `json:"width"`
					Height float64 `json:"height"`
				} `json:"source"`
				Resolutions []struct {
					URL    string  `json:"url"`
					Width  float64 `json:"width"`
					Height float64 `json:"height"`
				} `json:"resolutions"`
				Variants struct{} `json:"variants"`
				ID       string   `json:"id"`
			} `json:"images"`
			Enabled bool `json:"enabled"`
		} `json:"preview"`
		AllAwardings             []interface{} `json:"all_awardings"`
		Awarders                 []interface{} `json:"awarders"`
		MediaOnly                bool          `json:"media_only"`
		LinkFlairTemplateID      string        `json:"link_flair_template_id"`
		CanGild                  bool          `json:"can_gild"`
		Spoiler                  bool          `json:"spoiler"`
		Locked                   bool          `json:"locked"`
		AuthorFlairText          interface{}   `json:"author_flair_text"`
		TreatmentTags            []interface{} `json:"treatment_tags"`
		Visited                  bool          `json:"visited"`
		RemovedBy                interface{}   `json:"removed_by"`
		NumReports               interface{}   `json:"num_reports"`
		Distinguished            interface{}   `json:"distinguished"`
		SubredditID              string        `json:"subreddit_id"`
		AuthorIsBlocked          bool          `json:"author_is_blocked"`
		ModReasonBy              interface{}   `json:"mod_reason_by"`
		RemovalReason            interface{}   `json:"removal_reason"`
		LinkFlairBackgroundColor string        `json:"link_flair_background_color"`
		ID                       string        `json:"id"`
		IsRobotIndexable         bool          `json:"is_robot_indexable"`
		ReportReasons            interface{}   `json:"report_reasons"`
		Author                   string        `json:"author"`
		DiscussionType           interface{}   `json:"discussion_type"`
		NumComments              float64       `json:"num_comments"`
		SendReplies              bool          `json:"send_replies"`
		ContestMode              bool          `json:"contest_mode"`
		ModReports               []interface{} `json:"mod_reports"`
		AuthorPatreonFlair       bool          `json:"author_patreon_flair"`
		AuthorFlairTextColor     interface{}   `json:"author_flair_text_color"`
		Permalink                string        `json:"permalink"`
		Stickied                 bool          `json:"stickied"`
		URL                      string        `json:"url"`
		SubredditSubscribers     float64       `json:"subreddit_subscribers"`
		CreatedUtc               float64       `json:"created_utc"`
		NumCrossposts            float64       `json:"num_crossposts"`
		Media                    interface{}   `json:"media"`
		IsVideo                  bool          `json:"is_video"`
	} `json:"data"`
	Error interface{} `json:"error"`
}
