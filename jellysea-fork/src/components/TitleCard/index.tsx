import Button from '@app/components/Common/Button';
import CachedImage from '@app/components/Common/CachedImage';
import PlayButton from '@app/components/PlayButton';
import StatusBadgeMini from '@app/components/Common/StatusBadgeMini';
import RequestModal from '@app/components/RequestModal';
import ErrorCard from '@app/components/TitleCard/ErrorCard';
import Placeholder from '@app/components/TitleCard/Placeholder';
import { Permission, useUser } from '@app/hooks/useUser';
import globalMessages from '@app/i18n/globalMessages';
import api from '@app/utils/api';
import type { RatingResponse } from '@app/utils/types';
import { withProperties } from '@app/utils/typeHelpers';
import { Transition } from '@headlessui/react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { MediaStatus } from '@server/constants/media';
import type { MediaType } from '@server/models/Search';
import Link from 'next/link';
import usePlaybackProgress from '@app/hooks/usePlaybackProgress';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

interface TitleCardProps {
  id: number;
  image?: string;
  summary?: string;
  year?: string;
  title: string;
  userScore?: number;
  mediaType: MediaType;
  status?: MediaStatus;
  canExpand?: boolean;
  inProgress?: boolean;
  isAddedToWatchlist?: number | boolean;
  mutateParent?: () => void;
}

const TitleCard = ({
  id,
  image,
  summary: _summary,
  year,
  title,
  status,
  mediaType,
  isAddedToWatchlist: _isAddedToWatchlist,
  inProgress = false,
  canExpand = false,
  mutateParent: _mutateParent,
}: TitleCardProps) => {
  const intl = useIntl();
  const { hasPermission } = useUser();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [showDetail, setShowDetail] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const { loadProgress: loadPlaybackProgress } = usePlaybackProgress();

  const savedProgress = status === MediaStatus.AVAILABLE
    ? loadPlaybackProgress(id, mediaType === 'movie' || mediaType === 'tv' ? mediaType : 'movie')
    : null;

  if (year) {
    year = year.slice(0, 4);
  }

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  const { data: ratingData } = useSWR<RatingResponse>(
    mediaType === 'movie'
      ? `/movie/${id}/ratingscombined`
      : null,
    (url: string) => api.get(url).then((res) => res.data),
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  const displayScore = ratingData?.imdb?.criticsScore;

  const requestComplete = useCallback((newStatus: MediaStatus) => {
    setCurrentStatus(newStatus);
    setShowRequestModal(false);
  }, []);

  const closeModal = useCallback(() => setShowRequestModal(false), []);

  const showRequestButton = hasPermission(
    [
      Permission.REQUEST,
      mediaType === 'movie' || mediaType === 'collection'
        ? Permission.REQUEST_MOVIE
        : Permission.REQUEST_TV,
    ],
    { type: 'or' }
  );

  return (
    <div
      className={canExpand ? 'w-full' : 'w-36 sm:w-36 md:w-44'}
      data-testid="title-card"
    >
      <RequestModal
        tmdbId={id}
        show={showRequestModal}
        type={
          mediaType === 'movie'
            ? 'movie'
            : mediaType === 'collection'
              ? 'collection'
              : 'tv'
        }
        onComplete={requestComplete}
        onCancel={closeModal}
      />
      <div
        className={`relative transform-gpu cursor-default overflow-hidden rounded-xl bg-dark-900 bg-cover outline-none ring-1 transition duration-300 ${
          showDetail
            ? 'scale-105 shadow-lg ring-dark-500'
            : 'scale-100 shadow ring-dark-600'
        }`}
        style={{
          paddingBottom: '150%',
        }}
        onMouseEnter={() => setShowDetail(true)}
        onMouseLeave={() => setShowDetail(false)}
        onClick={() => setShowDetail(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setShowDetail(true);
          }
        }}
        role="link"
        tabIndex={0}
      >
          <div className="absolute inset-0 h-full w-full overflow-hidden">
            <CachedImage
              type="tmdb"
              className="absolute inset-0 h-full w-full"
              alt=""
              src={
                image
                  ? `https://image.tmdb.org/t/p/w300_and_h450_face${image}`
                  : `/images/seerr_poster_not_found_logo_top.png`
              }
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              fill
            />
            {savedProgress && savedProgress.duration > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-dark-700">
                <div
                  className="h-full bg-red-600 transition-all"
                  style={{
                    width: `${Math.min(100, (savedProgress.position / savedProgress.duration) * 100)}%`,
                  }}
                />
              </div>
            )}
          <div className="absolute left-0 right-0 flex items-center justify-between p-2">
            <div className="pointer-events-none z-40 self-start rounded bg-dark/70 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-white">
              {mediaType === 'movie'
                ? intl.formatMessage(globalMessages.movie)
                : mediaType === 'collection'
                  ? intl.formatMessage(globalMessages.collection)
                  : intl.formatMessage(globalMessages.tvshow)}
            </div>
            {currentStatus && currentStatus !== MediaStatus.UNKNOWN && (
              <div className="pointer-events-none z-40 flex">
                <StatusBadgeMini
                  status={currentStatus}
                  inProgress={inProgress}
                  shrink
                />
              </div>
            )}
          </div>
          <Transition
            as={Fragment}
            show={!image || showDetail || showRequestModal}
            enter="transition-opacity"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              <Link
                href={
                  mediaType === 'movie'
                    ? `/movie/${id}`
                    : mediaType === 'collection'
                      ? `/collection/${id}`
                      : `/tv/${id}`
                }
                className="absolute inset-0 h-full w-full cursor-pointer overflow-hidden text-left bg-gradient-to-t from-dark via-dark/60 to-transparent"
              >
                <div className="flex h-full w-full items-end">
                  <div className={`px-2 text-white ${
                    showRequestButton &&
                    (!currentStatus ||
                      currentStatus === MediaStatus.UNKNOWN ||
                      currentStatus === MediaStatus.DELETED)
                      ? 'pb-12'
                      : 'pb-2'
                  }`}>
                    <div className="flex flex-col justify-end">
                      <div className="text-sm font-bold leading-tight mb-1 line-clamp-2">{title}</div>
                      {year && <div className="text-xs text-slate-300 mb-1">{year}</div>}
                      {displayScore !== undefined && displayScore > 0 && (
                        <div className="text-xs text-yellow-400">
                          {Number(displayScore).toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </Transition>

          <div
            className={`absolute bottom-0 left-0 right-0 z-10 flex justify-between px-2 py-2 transition-opacity duration-300 ${
              showDetail || showRequestModal ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {currentStatus === MediaStatus.AVAILABLE ? (
              <div className="w-full" onClick={(e) => e.stopPropagation()}>
                <PlayButton
                  tmdbId={id}
                  mediaType={mediaType === 'movie' || mediaType === 'tv' ? mediaType : 'movie'}
                  title={title}
                  size="sm"
                  className="w-full justify-center"
                  resumePosition={savedProgress?.position ?? 0}
                />
              </div>
            ) : showRequestButton &&
              (!currentStatus ||
                currentStatus === MediaStatus.UNKNOWN ||
                currentStatus === MediaStatus.DELETED) ? (
                <Button
                  buttonType="primary"
                  buttonSize="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowRequestModal(true);
                  }}
                  className="h-7 w-full"
                >
                  <ArrowDownTrayIcon />
                  <span>{intl.formatMessage(globalMessages.request)}</span>
                </Button>
              ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default withProperties(TitleCard, { Placeholder, ErrorCard });
