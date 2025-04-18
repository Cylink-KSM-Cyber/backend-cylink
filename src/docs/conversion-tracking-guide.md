# CyLink Conversion Tracking Guide

This guide explains how to implement conversion tracking on your website using CyLink shortened URLs.

## Overview

Conversion tracking allows you to measure how many users that click on your shortened links complete desired actions on your website. This could include:

- Purchases
- Sign-ups
- Form submissions
- Newsletter subscriptions
- Downloads
- Any other valuable action

## Implementation Methods

There are two ways to implement conversion tracking:

1. **JavaScript Tracking Script (Recommended)**: Easy to implement, just add our script and call a function when a conversion happens.
2. **Direct API Integration**: For more control, make API calls directly to our conversion endpoint.

## Method 1: JavaScript Tracking Script

### Step 1: Add the Tracking Script

Add the following script tag to your website's HTML, preferably in the `<head>` section:

```html
<script src="https://cylink.id/api/v1/conversion-tracking.js"></script>
```

### Step 2: Track Conversions

Call the `trackCylinkConversion()` function when a conversion occurs:

```javascript
// Basic usage
trackCylinkConversion();

// With a specific goal and value
trackCylinkConversion({
  goalId: 1, // The ID of the conversion goal you created in CyLink
  value: 49.99, // Optional monetary value of the conversion
});

// With custom data
trackCylinkConversion({
  goalId: 1,
  value: 49.99,
  customData: {
    orderId: 'ORD-12345',
    productIds: [101, 102],
  },
});
```

### Advanced Options

The `trackCylinkConversion()` function accepts the following options:

```javascript
trackCylinkConversion({
  goalId: 1, // ID of the conversion goal (optional)
  value: 49.99, // Monetary value (optional)
  customData: {}, // Any additional data you want to record (optional)
  clearAfterConversion: true, // Whether to clear the tracking ID after conversion (default: false)
  onSuccess: function (result) {
    // Called when conversion is successfully tracked
    console.log('Conversion tracked!', result);
  },
  onError: function (error) {
    // Called when there's an error tracking the conversion
    console.error('Error tracking conversion:', error);
  },
});
```

## Method 2: Direct API Integration

For more control, you can make API calls directly to our conversion endpoint.

### Step 1: Get the Tracking ID

When someone clicks on a CyLink shortened URL, we add a `cyt` parameter to your destination URL. Extract this parameter to get the tracking ID:

```javascript
const urlParams = new URLSearchParams(window.location.search);
const trackingId = urlParams.get('cyt');
```

Store this tracking ID in a session or local storage for later use, as it identifies the user who clicked on your shortened link.

### Step 2: Send Conversion Data

When a conversion happens, make a POST request to our API endpoint:

```javascript
fetch('https://cylink.id/api/v1/conversions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tracking_id: trackingId,
    goal_id: 1, // Optional
    conversion_value: 49.99, // Optional
    custom_data: {
      // Optional
      orderId: 'ORD-12345',
      productIds: [101, 102],
    },
  }),
})
  .then(response => response.json())
  .then(data => console.log('Conversion tracked:', data))
  .catch(error => console.error('Error tracking conversion:', error));
```

## Setting Up Conversion Goals

Before tracking conversions, you should create conversion goals in your CyLink dashboard:

1. Log in to your CyLink account
2. Go to the "Conversion Goals" section
3. Click "Create New Goal"
4. Enter a name and description for your goal
5. Associate the goal with specific URLs you want to track

## Viewing Conversion Analytics

Once you've set up conversion tracking, you can view your conversion data in the CyLink dashboard:

1. Go to the "Analytics" section
2. Select the URL you want to analyze
3. View the "Conversions" tab to see:
   - Overall conversion rate
   - Conversions by goal
   - Conversion trends over time
   - Value of conversions

## Troubleshooting

If your conversions aren't being tracked correctly, check these common issues:

1. **Script not loaded**: Make sure the tracking script is properly included on your site.
2. **No tracking ID**: The user may not have come from a CyLink shortened link, or the tracking ID might be lost.
3. **Goal ID mismatch**: Verify that the goal ID you're using matches a goal in your CyLink account.
4. **CORS issues**: If you're using the API directly, ensure your domain is allowed to make requests to the CyLink API.

## Need Help?

If you need assistance implementing conversion tracking, contact our support team at support@cylink.id.

## API Reference

For complete API documentation, visit: https://cylink.id/api-docs
