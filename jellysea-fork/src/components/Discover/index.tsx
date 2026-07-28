import Header from '@app/components/Common/Header'
import MediaSlider from '@app/components/Common/MediaSlider'
import RecentlyAddedSlider from '@app/components/Discover/RecentlyAddedSlider'
import RecentRequestsSlider from '@app/components/Discover/RecentRequestsList'
import GenreSlider from '@app/components/Discover/GenreSlider'
import StudioSlider from '@app/components/Discover/StudioSlider'
import NetworkSlider from '@app/components/Discover/NetworkSlider'
export default function Discover() {
  return (
    <div className="animate-fade-in">
      <RecentlyAddedSlider />

      <MediaSlider
        title="Trending"
        url="/discover/trending"
        sliderKey="trending"
      />

      <RecentRequestsSlider />

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
