import Header from '@/components/Common/Header'
import MediaSlider from '@/components/Common/MediaSlider'
import RecentlyAddedSlider from '@/components/Discover/RecentlyAddedSlider'
import RecentRequestsSlider from '@/components/Discover/RecentRequestsList'
import GenreSlider from '@/components/Discover/GenreSlider'
import StudioSlider from '@/components/Discover/StudioSlider'
import NetworkSlider from '@/components/Discover/NetworkSlider'

export default function Discover() {
  return (
    <div>
      <Header>Discover</Header>

      <RecentlyAddedSlider />
      <RecentRequestsSlider />

      <MediaSlider
        title="Trending"
        url="/discover/trending"
        sliderKey="trending"
      />

      <MediaSlider
        title="Popular Movies"
        url="/discover/movies"
        sliderKey="popular-movies"
      />

      <GenreSlider
        title="Movie Genres"
        endpoint="/discover/genreslider/movie"
        mediaType="movie"
      />

      <MediaSlider
        title="Upcoming Movies"
        url="/discover/movies/upcoming"
        sliderKey="upcoming-movies"
        languageFilter="en"
      />

      <StudioSlider />

      <MediaSlider
        title="Popular Series"
        url="/discover/tv"
        sliderKey="popular-tv"
      />

      <GenreSlider
        title="Series Genres"
        endpoint="/discover/genreslider/tv"
        mediaType="tv"
      />

      <MediaSlider
        title="Upcoming Series"
        url="/discover/tv/upcoming"
        sliderKey="upcoming-tv"
        languageFilter="en"
      />

      <NetworkSlider />
    </div>
  )
}
