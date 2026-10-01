export const mockData = {
  "fixture": [
    {
      "id": 1,
      "fixture_code": "fixture code 1",
      "fixture_type": "SPOT",
      "position_x": "position x 1",
      "position_y": "position y 1",
      "dmx_address": "dmx address 1",
      "channel_count": "channel count 1",
      "color_mode": "color mode 1"
    },
    {
      "id": 2,
      "fixture_code": "fixture code 2",
      "fixture_type": "WASH",
      "position_x": "position x 2",
      "position_y": "position y 2",
      "dmx_address": "dmx address 2",
      "channel_count": "channel count 2",
      "color_mode": "color mode 2"
    },
    {
      "id": 3,
      "fixture_code": "fixture code 3",
      "fixture_type": "BEAM",
      "position_x": "position x 3",
      "position_y": "position y 3",
      "dmx_address": "dmx address 3",
      "channel_count": "channel count 3",
      "color_mode": "color mode 3"
    }
  ],
  "cueScene": [
    {
      "id": 1,
      "name": "开场暖场",
      "fixture_states": "fixture states 1",
      "fade_in_ms": "1500",
      "hold_ms": "8000",
      "priority": "10",
      "scene_status": "READY"
    },
    {
      "id": 2,
      "name": "主唱定点",
      "fixture_states": "fixture states 2",
      "fade_in_ms": "1000",
      "hold_ms": "12000",
      "priority": "20",
      "scene_status": "READY"
    },
    {
      "id": 3,
      "name": "尾声全亮",
      "fixture_states": "fixture states 3",
      "fade_in_ms": "2000",
      "hold_ms": "10000",
      "priority": "30",
      "scene_status": "DRAFT"
    }
  ],
  "timelineTrack": [
    {
      "id": 1,
      "cue_scene_id": 1,
      "start_ms": "0",
      "duration_ms": "9500",
      "layer": "MAIN",
      "locked": "false"
    },
    {
      "id": 2,
      "cue_scene_id": 2,
      "start_ms": "10000",
      "duration_ms": "13000",
      "layer": "MAIN",
      "locked": "false"
    },
    {
      "id": 3,
      "cue_scene_id": 3,
      "start_ms": "25000",
      "duration_ms": "12000",
      "layer": "MAIN",
      "locked": "true"
    }
  ],
  "showProject": [
    {
      "id": 1,
      "title": "title 1",
      "venue_name": "venue name 1",
      "fixture_ids": [
        1,
        2
      ],
      "track_ids": [
        1,
        2
      ],
      "updated_at": "2026-06-11T09:00:00Z"
    },
    {
      "id": 2,
      "title": "title 2",
      "venue_name": "venue name 2",
      "fixture_ids": [
        1,
        2
      ],
      "track_ids": [
        1,
        2
      ],
      "updated_at": "2026-06-12T09:00:00Z"
    },
    {
      "id": 3,
      "title": "title 3",
      "venue_name": "venue name 3",
      "fixture_ids": [
        1,
        2
      ],
      "track_ids": [
        1,
        2
      ],
      "updated_at": "2026-06-13T09:00:00Z"
    }
  ]
} as const;
